import { act, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { subscribeSSE } from '@/api/sse'
import { executeWorkflowTracked } from '@/services/workflowExecutionManager'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), subscribe: vi.fn() }))
vi.mock('@/api/workflow', () => ({ executeWorkflow: mocks.execute }))
vi.mock('@/api/sse', () => ({ subscribeSSE: mocks.subscribe }))
vi.mock('@/app/routes', () => ({ appRoutes: [] }))
vi.mock('react-router', () => ({ createBrowserRouter: vi.fn(() => ({})), RouterProvider: () => null }))
vi.mock('@/components/common/Modal', () => ({ default: () => null }))
vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }))

type Subscription = Parameters<typeof subscribeSSE>[0]

describe('App의 실행 추적 수명 정리', () => {
	beforeEach(() => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		mocks.execute.mockReset()
		mocks.subscribe.mockReset()
		mocks.subscribe.mockResolvedValue(undefined)
		useAuthStore.getState().setAuth('test-access-token', 'test-refresh-token')
	})

	afterEach(() => vi.unstubAllEnvs())

	it('StrictMode mount 뒤 실행할 수 있고 실제 App unmount는 SSE와 모든 상태를 정리한다', async () => {
		const { unmount } = render(
			<StrictMode>
				<App />
			</StrictMode>
		)
		mocks.execute.mockImplementation((workflowId: string) =>
			Promise.resolve({ data: { id: `execution-${workflowId}`, workflowId } })
		)
		await act(async () => {
			await executeWorkflowTracked('workflow-a')
			await executeWorkflowTracked('workflow-b')
		})
		expect(mocks.execute).toHaveBeenCalledTimes(2)
		expect(mocks.subscribe).toHaveBeenCalledTimes(2)
		expect(useExecutionStore.getState().executions['workflow-a']?.phase).toBe('running')
		expect(useExecutionStore.getState().executions['workflow-b']?.phase).toBe('running')
		const subscriptions = mocks.subscribe.mock.calls.map(([subscription]) => subscription as Subscription)
		expect(subscriptions.every(subscription => subscription.signal?.aborted === false)).toBe(true)

		unmount()

		expect(subscriptions.every(subscription => subscription.signal?.aborted === true)).toBe(true)
		expect(useExecutionStore.getState().executions).toEqual({})
		act(() => {
			subscriptions[0].onEvent(
				JSON.stringify({
					type: 'EXECUTION_COMPLETED',
					workflowId: 'workflow-a',
					executionId: 'execution-workflow-a',
					executionStatus: 'SUCCESS',
				})
			)
			subscriptions[1].onError?.(new Error('late connection error'))
		})
		expect(useExecutionStore.getState().executions).toEqual({})
	})

	it('POST가 대기하는 동안 App을 unmount하면 늦은 응답으로 SSE와 상태를 생성하지 않는다', async () => {
		let resolve!: (value: { data: { id: string; workflowId: string } }) => void
		mocks.execute.mockReturnValue(
			new Promise(value => {
				resolve = value
			})
		)
		const { unmount } = render(<App />)
		let executionRequest!: ReturnType<typeof executeWorkflowTracked>
		act(() => {
			executionRequest = executeWorkflowTracked('workflow-a')
		})
		expect(useExecutionStore.getState().executions['workflow-a']?.phase).toBe('requesting')
		expect(mocks.execute).toHaveBeenCalledTimes(1)
		expect(mocks.subscribe).not.toHaveBeenCalled()

		unmount()
		expect(useExecutionStore.getState().executions).toEqual({})
		await act(async () => {
			resolve({ data: { id: 'execution-late', workflowId: 'workflow-a' } })
			await expect(executionRequest).resolves.toBeUndefined()
		})

		expect(mocks.subscribe).not.toHaveBeenCalled()
		expect(useExecutionStore.getState().executions).toEqual({})
	})
})
