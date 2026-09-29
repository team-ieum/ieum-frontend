import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { useToggleWorkflowMutation } from '@/hooks/workflow/mutations/useToggleWorkflowMutation'
import { workflowDetailResponse, workflowFixture } from '@/mocks/fixtures/workflows'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { ApiResponse } from '@/types/api'
import type { WorkflowDto } from '@/types/workflowList'

const mocks = vi.hoisted(() => ({
	activate: vi.fn(),
	deactivate: vi.fn(),
}))

vi.mock('@/api/workflow', () => ({
	activateWorkflow: mocks.activate,
	deactivateWorkflow: mocks.deactivate,
}))

type WorkflowResponse = ApiResponse<WorkflowDto>

const responseFor = (id: string, active: boolean): WorkflowResponse => ({
	...workflowDetailResponse,
	data: { ...workflowFixture, id, active },
})

const deferred = <T,>() => {
	let resolve!: (value: T) => void
	let reject!: (reason?: unknown) => void
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve
		reject = onReject
	})
	return { promise, resolve, reject }
}

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

describe('useToggleWorkflowMutation', () => {
	beforeEach(() => {
		mocks.activate.mockReset()
		mocks.deactivate.mockReset()
	})

	it('같은 workflow의 연속 토글을 순서대로 전송하고 마지막 성공 상태를 상세 캐시에 남긴다', async () => {
		const queryClient = createTestQueryClient()
		const first = deferred<WorkflowResponse>()
		mocks.activate.mockReturnValueOnce(first.promise)
		mocks.deactivate.mockResolvedValueOnce(responseFor('workflow-a', false))
		const { result } = renderHook(() => useToggleWorkflowMutation('workflow-a'), {
			wrapper: createWrapper(queryClient),
		})

		let firstAction!: Promise<WorkflowResponse>
		let secondAction!: Promise<WorkflowResponse>
		act(() => {
			firstAction = result.current.mutateAsync(true)
			secondAction = result.current.mutateAsync(false)
		})

		await waitFor(() => expect(mocks.activate).toHaveBeenCalledExactlyOnceWith('workflow-a'))
		expect(mocks.deactivate).not.toHaveBeenCalled()

		await act(async () => {
			first.resolve(responseFor('workflow-a', true))
			await firstAction
		})
		await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith('workflow-a'))
		await act(async () => {
			await secondAction
		})

		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(responseFor('workflow-a', false))
		queryClient.clear()
	})

	it('앞선 토글 요청이 실패해도 같은 workflow의 다음 요청을 실행한다', async () => {
		const queryClient = createTestQueryClient()
		const first = deferred<WorkflowResponse>()
		const firstError = new Error('activate failed')
		mocks.activate.mockReturnValueOnce(first.promise)
		mocks.deactivate.mockResolvedValueOnce(responseFor('workflow-a', false))
		const { result } = renderHook(() => useToggleWorkflowMutation('workflow-a'), {
			wrapper: createWrapper(queryClient),
		})

		let firstAction!: Promise<unknown>
		let secondAction!: Promise<WorkflowResponse>
		act(() => {
			firstAction = result.current.mutateAsync(true).catch(error => error)
			secondAction = result.current.mutateAsync(false)
		})
		await waitFor(() => expect(mocks.activate).toHaveBeenCalledExactlyOnceWith('workflow-a'))
		expect(mocks.deactivate).not.toHaveBeenCalled()

		await act(async () => {
			first.reject(firstError)
			expect(await firstAction).toBe(firstError)
		})
		await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith('workflow-a'))
		await act(async () => {
			await secondAction
		})

		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(responseFor('workflow-a', false))
		queryClient.clear()
	})

	it('workflow A의 대기 요청이 workflow B의 토글을 막지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const firstA = deferred<WorkflowResponse>()
		mocks.activate.mockImplementation((id: string) =>
			id === 'workflow-a' ? firstA.promise : Promise.resolve(responseFor(id, true))
		)
		mocks.deactivate.mockResolvedValue(responseFor('workflow-a', false))
		const { result } = renderHook(
			() => ({
				a: useToggleWorkflowMutation('workflow-a'),
				b: useToggleWorkflowMutation('workflow-b'),
			}),
			{ wrapper: createWrapper(queryClient) }
		)

		let firstAction!: Promise<WorkflowResponse>
		let queuedAction!: Promise<WorkflowResponse>
		let otherAction!: Promise<WorkflowResponse>
		act(() => {
			firstAction = result.current.a.mutateAsync(true)
			queuedAction = result.current.a.mutateAsync(false)
			otherAction = result.current.b.mutateAsync(true)
		})

		await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith('workflow-b'))
		expect(mocks.deactivate).not.toHaveBeenCalled()
		await act(async () => {
			await otherAction
		})
		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-b'))).toEqual(responseFor('workflow-b', true))

		await act(async () => {
			firstA.resolve(responseFor('workflow-a', true))
			await firstAction
			await queuedAction
		})
		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(responseFor('workflow-a', false))
		queryClient.clear()
	})

	it('같은 훅을 A에서 B로 다시 렌더링해도 늦은 A 응답은 A 상세 캐시만 갱신한다', async () => {
		const queryClient = createTestQueryClient()
		const firstA = deferred<WorkflowResponse>()
		mocks.activate.mockImplementation((id: string) =>
			id === 'workflow-a' ? firstA.promise : Promise.resolve(responseFor(id, true))
		)
		const { result, rerender } = renderHook(({ id }) => useToggleWorkflowMutation(id), {
			initialProps: { id: 'workflow-a' },
			wrapper: createWrapper(queryClient),
		})

		let firstAction!: Promise<WorkflowResponse>
		act(() => {
			firstAction = result.current.mutateAsync(true)
		})
		await waitFor(() => expect(mocks.activate).toHaveBeenCalledExactlyOnceWith('workflow-a'))
		rerender({ id: 'workflow-b' })

		let secondAction!: Promise<WorkflowResponse>
		act(() => {
			secondAction = result.current.mutateAsync(true)
		})
		await act(async () => {
			await secondAction
		})

		await act(async () => {
			firstA.resolve(responseFor('workflow-a', true))
			await firstAction
		})
		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(responseFor('workflow-a', true))
		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-b'))).toEqual(responseFor('workflow-b', true))
		queryClient.clear()
	})
})
