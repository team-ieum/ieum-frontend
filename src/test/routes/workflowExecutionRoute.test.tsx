import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { subscribeSSE } from '@/api/sse'
import { queryKeys } from '@/constants/queryKeys'
import { WORKFLOW_FIXTURE_ID, workflowDetailResponse, workflowFixture } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useModalStore } from '@/stores/useModalStore'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

const mocks = vi.hoisted(() => ({ subscribe: vi.fn() }))
vi.mock('@/api/sse', () => ({ subscribeSSE: mocks.subscribe }))
vi.mock('sockjs-client', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@stomp/stompjs', () => ({
	Client: class {
		active = false
		connected = false
		activate() {
			this.active = true
		}
		deactivate() {
			this.active = false
			return Promise.resolve()
		}
		subscribe() {
			return { unsubscribe: vi.fn() }
		}
		publish() {}
	},
}))
vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

type Subscription = Parameters<typeof subscribeSSE>[0]
const secondWorkflowId = '33333333-3333-4333-8333-333333333333'
const firstPath = `/workflow/${WORKFLOW_FIXTURE_ID}`
const secondPath = `/workflow/${secondWorkflowId}`
const secondWorkflow = { ...workflowFixture, id: secondWorkflowId, name: '두 번째 워크플로우' }
const subscriptions: Subscription[] = []
const requestedWorkflows: string[] = []

const renderExecutionRoute = () => {
	const queryClient = createTestQueryClient()
	queryClient.setQueryData(queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID), workflowDetailResponse)
	queryClient.setQueryData(queryKeys.workflows.detail(secondWorkflowId), {
		...workflowDetailResponse,
		data: secondWorkflow,
	})
	return renderAppRoute(firstPath, { queryClient })
}

const emit = (subscription: Subscription, workflowId: string, event: Record<string, unknown>) => {
	const executionId = subscription.url.split('/executions/')[1].split('/')[0]
	act(() => subscription.onEvent(JSON.stringify({ workflowId, executionId, ...event })))
}

const startExecution = async () => {
	fireEvent.click(screen.getByRole('button', { name: 'Deploy' }))
	await screen.findByRole('button', { name: '실행 중…' })
	await waitFor(() => expect(subscriptions.length).toBeGreaterThan(0))
}

describe('실제 workflow route의 백그라운드 실행 추적', () => {
	beforeEach(() => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		subscriptions.length = 0
		requestedWorkflows.length = 0
		mocks.subscribe.mockReset()
		mocks.subscribe.mockImplementation((options: Subscription) => {
			subscriptions.push(options)
			return Promise.resolve()
		})
		server.use(
			http.get('*/api/v1/workflows/:workflowId', ({ params }) =>
				HttpResponse.json({
					...workflowDetailResponse,
					data: params.workflowId === secondWorkflowId ? secondWorkflow : workflowFixture,
				})
			),
			http.post('*/api/v1/workflows/:workflowId/execute', ({ params }) => {
				const workflowId = String(params.workflowId)
				requestedWorkflows.push(workflowId)
				return HttpResponse.json({
					success: true,
					data: { id: `execution-${requestedWorkflows.length}`, workflowId },
					message: 'success',
					code: 'SUCCESS',
				})
			})
		)
	})

	afterEach(() => vi.unstubAllEnvs())

	it('A 실행 중 B를 독립적으로 실행하고 목록을 거쳐 A로 돌아와도 구독을 다시 만들지 않는다', async () => {
		const { router } = renderExecutionRoute()
		await screen.findByDisplayValue(workflowFixture.name)
		await startExecution()
		const firstSubscription = subscriptions[0]
		emit(firstSubscription, WORKFLOW_FIXTURE_ID, { type: 'NODE_STARTED', nodeId: 'trigger-1' })
		expect(useExecutionStore.getState().executions[WORKFLOW_FIXTURE_ID]?.nodeStatus['trigger-1']).toBe('running')

		await act(async () => router.navigate(secondPath))
		await screen.findByDisplayValue(secondWorkflow.name)
		expect(screen.getByRole('button', { name: 'Deploy' })).toBeEnabled()
		expect(screen.queryByText('워크플로우를 실행하고 있어요.')).not.toBeInTheDocument()
		await startExecution()
		await waitFor(() => expect(subscriptions).toHaveLength(2))
		emit(subscriptions[1], secondWorkflowId, { type: 'NODE_FAILED', nodeId: 'trigger-1' })
		expect(useExecutionStore.getState().executions[secondWorkflowId]?.nodeStatus['trigger-1']).toBe('failed')
		expect(useExecutionStore.getState().executions[WORKFLOW_FIXTURE_ID]?.nodeStatus['trigger-1']).toBe('running')
		expect(firstSubscription.signal?.aborted).toBe(false)

		await act(async () => router.navigate('/workflow'))
		await waitFor(() => expect(screen.queryByDisplayValue(secondWorkflow.name)).not.toBeInTheDocument())
		expect(subscriptions.every(subscription => subscription.signal?.aborted === false)).toBe(true)
		await act(async () => router.navigate(firstPath))
		await screen.findByDisplayValue(workflowFixture.name)
		expect(screen.getByRole('button', { name: '실행 중…' })).toBeDisabled()
		expect(screen.getByText('워크플로우를 실행하고 있어요.')).toBeInTheDocument()
		expect(useExecutionStore.getState().executions[WORKFLOW_FIXTURE_ID]?.nodeStatus['trigger-1']).toBe('running')
		expect(subscriptions).toHaveLength(2)
		expect(requestedWorkflows).toEqual([WORKFLOW_FIXTURE_ID, secondWorkflowId])
	})

	it('목록 화면에서 완료된 실행의 결과를 상세 재진입 시 유지한다', async () => {
		const { router } = renderExecutionRoute()
		await screen.findByDisplayValue(workflowFixture.name)
		await startExecution()
		const subscription = subscriptions[0]
		await act(async () => router.navigate('/workflow'))
		emit(subscription, WORKFLOW_FIXTURE_ID, { type: 'NODE_COMPLETED', nodeId: 'trigger-1', status: 'SUCCESS' })
		emit(subscription, WORKFLOW_FIXTURE_ID, { type: 'EXECUTION_COMPLETED', executionStatus: 'SUCCESS' })
		expect(subscription.signal?.aborted).toBe(true)
		expect(screen.queryByText('워크플로우 실행이 완료됐어요.')).not.toBeInTheDocument()

		await act(async () => router.navigate(firstPath))
		await screen.findByDisplayValue(workflowFixture.name)
		expect(screen.getByText('워크플로우 실행이 완료됐어요.')).toBeInTheDocument()
		expect(useExecutionStore.getState().executions[WORKFLOW_FIXTURE_ID]?.nodeStatus['trigger-1']).toBe('success')
		expect(screen.getByRole('button', { name: 'Deploy' })).toBeEnabled()
		expect(subscriptions).toHaveLength(1)
		expect(requestedWorkflows).toEqual([WORKFLOW_FIXTURE_ID])
	})

	it('추적 중단 후 새 실행 확인을 취소하면 요청하지 않고 확인하면 한 번 요청한다', async () => {
		renderExecutionRoute()
		await screen.findByDisplayValue(workflowFixture.name)
		await startExecution()
		act(() => subscriptions[0].onError?.(new Error('connection lost')))
		expect(screen.getByText('실행 상태 추적이 중단됐어요. 이전 실행은 서버에서 계속될 수 있어요.')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Deploy' }))
		expect(screen.getByRole('heading', { name: '다시 실행할까요?' })).toBeInTheDocument()
		expect(requestedWorkflows).toHaveLength(1)
		fireEvent.click(screen.getByRole('button', { name: '취소' }))
		expect(useModalStore.getState().isOpen).toBe(false)
		expect(requestedWorkflows).toHaveLength(1)

		fireEvent.click(screen.getByRole('button', { name: 'Deploy' }))
		fireEvent.click(screen.getByRole('button', { name: '새로 실행' }))
		await screen.findByRole('button', { name: '실행 중…' })
		await waitFor(() => expect(subscriptions).toHaveLength(2))
		expect(requestedWorkflows).toEqual([WORKFLOW_FIXTURE_ID, WORKFLOW_FIXTURE_ID])
		expect(subscriptions[0].signal?.aborted).toBe(true)
		expect(subscriptions[1].signal?.aborted).toBe(false)
	})
})
