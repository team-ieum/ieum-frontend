import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { subscribeSSE } from '@/api/sse'
import { disposeExecutionTracking, executeWorkflowTracked } from '@/services/workflowExecutionManager'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), subscribe: vi.fn() }))
vi.mock('@/api/workflow', () => ({ executeWorkflow: mocks.execute }))
vi.mock('@/api/sse', () => ({ subscribeSSE: mocks.subscribe }))

type Subscription = Parameters<typeof subscribeSSE>[0]
const subscriptions: Subscription[] = []
const deferred = <T>() => {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve
		reject = onReject
	})
	return { promise, resolve, reject }
}
const responseFor = (workflowId: string, executionId: string) => ({ data: { id: executionId, workflowId } })
const stateOf = (workflowId: string) => useExecutionStore.getState().executions[workflowId]
const emit = (index: number, event: Record<string, unknown>) => {
	act(() => subscriptions[index].onEvent(JSON.stringify(event)))
}

describe('workflowExecutionManager', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		mocks.execute.mockReset()
		mocks.subscribe.mockReset()
		subscriptions.length = 0
		mocks.subscribe.mockImplementation((options: Subscription) => {
			subscriptions.push(options)
			return Promise.resolve()
		})
		useExecutionStore.getState().resetAll()
		useAuthStore.getState().setAuth('test-access-token', 'test-refresh-token')
		vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
	})

	afterEach(() => {
		disposeExecutionTracking()
		vi.useRealTimers()
		vi.unstubAllEnvs()
	})

	it('서로 다른 workflow의 요청과 동일 node ID 상태를 독립적으로 관리한다', async () => {
		const first = deferred<ReturnType<typeof responseFor>>()
		const second = deferred<ReturnType<typeof responseFor>>()
		mocks.execute.mockImplementation((workflowId: string) => (workflowId === 'workflow-a' ? first.promise : second.promise))
		const firstRun = executeWorkflowTracked('workflow-a')
		const secondRun = executeWorkflowTracked('workflow-b')
		expect(mocks.execute).toHaveBeenCalledTimes(2)
		expect(stateOf('workflow-a')?.phase).toBe('requesting')
		expect(stateOf('workflow-b')?.phase).toBe('requesting')

		second.resolve(responseFor('workflow-b', 'execution-b'))
		await expect(secondRun).resolves.toBe('execution-b')
		first.resolve(responseFor('workflow-a', 'execution-a'))
		await expect(firstRun).resolves.toBe('execution-a')
		const aIndex = subscriptions.findIndex(item => item.url.includes('/workflow-a/'))
		const bIndex = subscriptions.findIndex(item => item.url.includes('/workflow-b/'))
		expect(aIndex).toBeGreaterThanOrEqual(0)
		expect(bIndex).toBeGreaterThanOrEqual(0)
		emit(bIndex, { type: 'NODE_FAILED', workflowId: 'workflow-b', executionId: 'execution-b', nodeId: 'shared' })
		emit(aIndex, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'shared',
		})
		expect(stateOf('workflow-a')?.nodeStatus.shared).toBe('success')
		expect(stateOf('workflow-b')?.nodeStatus.shared).toBe('failed')
	})

	it('POST 응답 대기 중 같은 workflow의 연속 실행을 한 번만 요청한다', async () => {
		const pending = deferred<ReturnType<typeof responseFor>>()
		mocks.execute.mockReturnValue(pending.promise)
		const firstRun = executeWorkflowTracked('workflow-a')
		const duplicate = executeWorkflowTracked('workflow-a')
		expect(mocks.execute).toHaveBeenCalledExactlyOnceWith('workflow-a')
		await expect(duplicate).resolves.toBeUndefined()
		pending.resolve(responseFor('workflow-a', 'execution-a'))
		await expect(firstRun).resolves.toBe('execution-a')
		expect(subscriptions).toHaveLength(1)
	})

	it('POST 중 토큰이 갱신되면 SSE 연결에 최신 토큰을 사용한다', async () => {
		const pending = deferred<ReturnType<typeof responseFor>>()
		mocks.execute.mockReturnValue(pending.promise)
		const run = executeWorkflowTracked('workflow-a')
		useAuthStore.getState().setAuth('refreshed-access-token', 'refreshed-refresh-token')
		pending.resolve(responseFor('workflow-a', 'execution-a'))
		await run
		expect(subscriptions[0].token).toBe('refreshed-access-token')
		expect(stateOf('workflow-a')?.phase).toBe('running')
	})

	it.each([
		['SUCCESS', 'success'],
		['FAILED', 'failed'],
		['WAITING_APPROVAL', 'waitingApproval'],
	] as const)('완료 상태 %s를 %s 단계로 보존한다', async (result, phase) => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		emit(0, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		emit(0, {
			type: 'EXECUTION_COMPLETED',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			executionStatus: result,
		})
		expect(stateOf('workflow-a')?.phase).toBe(phase)
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
		expect(subscriptions[0].signal?.aborted).toBe(true)
	})

	it('승인 요청 노드를 표시하고 승인 대기 종료 후 같은 탭의 재실행을 차단한다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		emit(0, { type: 'APPROVAL_REQUESTED', workflowId: 'workflow-a', executionId: 'execution-a', nodeId: 'approval' })
		expect(stateOf('workflow-a')?.nodeStatus.approval).toBe('waitingApproval')
		emit(0, {
			type: 'EXECUTION_COMPLETED',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			executionStatus: 'WAITING_APPROVAL',
		})
		await expect(executeWorkflowTracked('workflow-a')).resolves.toBeUndefined()
		expect(mocks.execute).toHaveBeenCalledTimes(1)
	})

	it('종료 이벤트 없는 EOF와 오류는 같은 실행을 재구독하고 연속 실패 한도 뒤 마지막 상태를 유지한다', async () => {
		mocks.execute
			.mockResolvedValueOnce(responseFor('workflow-a', 'execution-a'))
			.mockResolvedValueOnce(responseFor('workflow-b', 'execution-b'))
		await executeWorkflowTracked('workflow-a')
		await executeWorkflowTracked('workflow-b')
		emit(0, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		emit(1, { type: 'NODE_FAILED', workflowId: 'workflow-b', executionId: 'execution-b', nodeId: 'node-b' })
		act(() => {
			subscriptions[0].onDone?.()
			subscriptions[1].onError?.(new Error('network disconnected'))
		})
		expect(stateOf('workflow-a')?.phase).toBe('running')
		expect(stateOf('workflow-b')?.phase).toBe('running')
		for (let retry = 0; retry < 6; retry++) {
			await act(async () => vi.advanceTimersByTimeAsync(30000))
			const latestA = subscriptions.filter(item => item.url.includes('/workflow-a/')).at(-1)!
			const latestB = subscriptions.filter(item => item.url.includes('/workflow-b/')).at(-1)!
			act(() => {
				latestA.onDone?.()
				latestB.onError?.(new Error('network disconnected'))
			})
		}
		expect(stateOf('workflow-a')?.phase).toBe('interrupted')
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
		expect(stateOf('workflow-b')?.phase).toBe('interrupted')
		expect(stateOf('workflow-b')?.nodeStatus['node-b']).toBe('failed')
		expect(mocks.execute).toHaveBeenCalledTimes(2)
		expect(subscriptions.filter(item => item.url.includes('/execution-a/'))).toHaveLength(7)
	})

	it('추적 중단 뒤 재실행하면 이전 구독의 지연 이벤트를 무시한다', async () => {
		mocks.execute
			.mockResolvedValueOnce(responseFor('workflow-a', 'execution-old'))
			.mockResolvedValueOnce(responseFor('workflow-a', 'execution-new'))
		await executeWorkflowTracked('workflow-a')
		emit(0, { type: 'NODE_FAILED', workflowId: 'workflow-a', executionId: 'execution-old', nodeId: 'node-a' })
		act(() => subscriptions[0].onError?.(Object.assign(new Error('Forbidden'), { status: 403 })))
		await executeWorkflowTracked('workflow-a')
		expect(stateOf('workflow-a')?.executionId).toBe('execution-new')
		expect(stateOf('workflow-a')?.nodeStatus).toEqual({})
		emit(0, {
			type: 'EXECUTION_COMPLETED',
			workflowId: 'workflow-a',
			executionId: 'execution-old',
			executionStatus: 'FAILED',
		})
		expect(stateOf('workflow-a')?.phase).toBe('running')
		emit(1, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-new',
			nodeId: 'node-a',
		})
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
	})

	it('다른 실행 식별자를 무시하고 완료 노드를 늦은 시작 이벤트로 되돌리지 않는다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		emit(0, { type: 'NODE_FAILED', workflowId: 'workflow-b', executionId: 'execution-a', nodeId: 'node-a' })
		emit(0, { type: 'NODE_FAILED', workflowId: 'workflow-a', executionId: 'other', nodeId: 'node-a' })
		expect(stateOf('workflow-a')?.nodeStatus).toEqual({})
		emit(0, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		emit(0, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		emit(0, { type: 'NODE_STARTED', workflowId: 'workflow-a', executionId: 'execution-a', nodeId: 'node-a' })
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
	})

	it('로그아웃하면 모든 구독과 상태를 정리한다', async () => {
		mocks.execute
			.mockResolvedValueOnce(responseFor('workflow-a', 'execution-a'))
			.mockResolvedValueOnce(responseFor('workflow-b', 'execution-b'))
		await executeWorkflowTracked('workflow-a')
		await executeWorkflowTracked('workflow-b')
		act(() => useAuthStore.getState().clearAuth())
		expect(subscriptions.every(item => item.signal?.aborted)).toBe(true)
		expect(useExecutionStore.getState().executions).toEqual({})
		emit(0, { type: 'NODE_FAILED', workflowId: 'workflow-a', executionId: 'execution-a', nodeId: 'node-a' })
		expect(useExecutionStore.getState().executions).toEqual({})
	})

	it('알 수 없는 노드 완료를 무시한 뒤 유효한 SKIPPED 이벤트를 처리한다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		const event = { type: 'NODE_COMPLETED', workflowId: 'workflow-a', executionId: 'execution-a', nodeId: 'node-a' }
		emit(0, event)
		emit(0, { ...event, status: 'UNKNOWN' })
		expect(stateOf('workflow-a')?.nodeStatus).toEqual({})
		emit(0, { ...event, status: 'SKIPPED' })
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('skipped')
	})

	it('명시적인 실행 완료 상태가 알 수 없는 값이면 성공 대신 추적 중단으로 처리한다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		emit(0, { type: 'EXECUTION_COMPLETED', workflowId: 'workflow-a', executionId: 'execution-a', executionStatus: 'UNKNOWN' })
		expect(stateOf('workflow-a')?.phase).toBe('interrupted')
		expect(subscriptions[0].signal?.aborted).toBe(true)
	})

	it('완료 결과를 이전 자동 초기화 시간 이후에도 보존한다', async () => {
		vi.useFakeTimers()
		try {
			mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
			await executeWorkflowTracked('workflow-a')
			emit(0, {
				type: 'NODE_COMPLETED',
				status: 'SUCCESS',
				workflowId: 'workflow-a',
				executionId: 'execution-a',
				nodeId: 'node-a',
			})
			emit(0, {
				type: 'EXECUTION_COMPLETED',
				workflowId: 'workflow-a',
				executionId: 'execution-a',
				executionStatus: 'SUCCESS',
			})
			vi.advanceTimersByTime(60_000)
			expect(stateOf('workflow-a')?.phase).toBe('success')
			expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
		} finally {
			vi.useRealTimers()
		}
	})

	it('관리자 정리 후 도착한 POST 응답은 SSE를 열지 않는다', async () => {
		const pending = deferred<ReturnType<typeof responseFor>>()
		mocks.execute.mockReturnValue(pending.promise)
		const run = executeWorkflowTracked('workflow-a')
		disposeExecutionTracking()
		pending.resolve(responseFor('workflow-a', 'execution-late'))
		await run
		expect(subscriptions).toHaveLength(0)
		expect(useExecutionStore.getState().executions).toEqual({})
	})

	it('POST 실패를 기록하고 같은 workflow를 다시 실행할 수 있다', async () => {
		mocks.execute
			.mockRejectedValueOnce(new Error('request failed'))
			.mockResolvedValueOnce(responseFor('workflow-a', 'execution-retry'))
		await expect(executeWorkflowTracked('workflow-a')).rejects.toThrow('request failed')
		expect(stateOf('workflow-a')?.phase).toBe('requestFailed')
		await executeWorkflowTracked('workflow-a')
		expect(stateOf('workflow-a')?.phase).toBe('running')
	})

	it('재접속은 새 POST 없이 같은 실행 GET과 최신 토큰을 사용하고 중복 종료 콜백을 무시한다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		const first = subscriptions[0]
		emit(0, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		act(() => {
			first.onDone?.()
			first.onError?.(new Error('duplicate close'))
		})
		useAuthStore.getState().setAuth('new-access-token', 'new-refresh-token')
		await act(async () => vi.advanceTimersByTimeAsync(1000))
		expect(subscriptions).toHaveLength(2)
		expect(subscriptions[1].url).toBe(first.url)
		expect(subscriptions[1].token).toBe('new-access-token')
		expect(mocks.execute).toHaveBeenCalledExactlyOnceWith('workflow-a')
		expect(stateOf('workflow-a')?.executionId).toBe('execution-a')
		emit(0, { type: 'EXECUTION_COMPLETED', workflowId: 'workflow-a', executionId: 'execution-a', executionStatus: 'FAILED' })
		expect(stateOf('workflow-a')?.phase).toBe('running')
		emit(1, {
			type: 'NODE_COMPLETED',
			status: 'SUCCESS',
			workflowId: 'workflow-a',
			executionId: 'execution-a',
			nodeId: 'node-a',
		})
		emit(1, { type: 'NODE_STARTED', workflowId: 'workflow-a', executionId: 'execution-a', nodeId: 'node-a' })
		expect(stateOf('workflow-a')?.nodeStatus['node-a']).toBe('success')
		emit(1, { type: 'EXECUTION_COMPLETED', workflowId: 'workflow-a', executionId: 'execution-a', executionStatus: 'SUCCESS' })
		act(() => subscriptions[1].onDone?.())
		await act(async () => vi.advanceTimersByTimeAsync(60000))
		expect(stateOf('workflow-a')?.phase).toBe('success')
		expect(subscriptions).toHaveLength(2)
	})

	it.each([401, 403])('인증·권한 오류 %s는 GET 재시도 없이 추적을 종료한다', async status => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		act(() => subscriptions[0].onError?.(Object.assign(new Error('unauthorized'), { status })))
		await act(async () => vi.advanceTimersByTimeAsync(120000))
		expect(stateOf('workflow-a')?.phase).toBe('interrupted')
		expect(subscriptions).toHaveLength(1)
		expect(mocks.execute).toHaveBeenCalledTimes(1)
	})

	it('로그아웃은 예약한 재접속도 취소한다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		act(() => subscriptions[0].onDone?.())
		act(() => useAuthStore.getState().clearAuth())
		await act(async () => vi.advanceTimersByTimeAsync(120000))
		expect(subscriptions).toHaveLength(1)
		expect(useExecutionStore.getState().executions).toEqual({})
	})

	it('정리 후 새 실행에는 이전 재접속 타이머와 이벤트가 영향을 주지 않는다', async () => {
		mocks.execute
			.mockResolvedValueOnce(responseFor('workflow-a', 'old'))
			.mockResolvedValueOnce(responseFor('workflow-a', 'new'))
		await executeWorkflowTracked('workflow-a')
		act(() => subscriptions[0].onDone?.())
		disposeExecutionTracking()
		await executeWorkflowTracked('workflow-a')
		await act(async () => vi.advanceTimersByTimeAsync(120000))
		emit(0, { type: 'EXECUTION_COMPLETED', workflowId: 'workflow-a', executionId: 'old', executionStatus: 'FAILED' })
		expect(subscriptions).toHaveLength(2)
		expect(stateOf('workflow-a')?.executionId).toBe('new')
		expect(stateOf('workflow-a')?.phase).toBe('running')
	})

	it('정상 장기 스트림의 주기적 종료는 실패 예산을 소진하지 않는다', async () => {
		mocks.execute.mockResolvedValue(responseFor('workflow-a', 'execution-a'))
		await executeWorkflowTracked('workflow-a')
		for (let rotation = 0; rotation < 8; rotation++) {
			const current = subscriptions.at(-1)!
			act(() => current.onOpen?.())
			await act(async () => vi.advanceTimersByTimeAsync(600000))
			act(() => current.onDone?.())
			await act(async () => vi.advanceTimersByTimeAsync(1000))
		}
		expect(stateOf('workflow-a')?.phase).toBe('running')
		expect(subscriptions).toHaveLength(9)
		expect(mocks.execute).toHaveBeenCalledTimes(1)
	})
})
