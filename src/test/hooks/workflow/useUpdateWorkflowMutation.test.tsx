import { act, renderHook } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { useUpdateWorkflowMutation } from '@/hooks/workflow/mutations/useUpdateWorkflowMutation'
import { workflowDetailResponse, workflowFixture, workflowListResponse } from '@/mocks/fixtures/workflows'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { UpdateWorkflowRequest } from '@/types/workflow'

const mocks = vi.hoisted(() => ({
	update: vi.fn(),
}))

vi.mock('@/api/workflow', () => ({
	updateWorkflow: mocks.update,
}))

const body: UpdateWorkflowRequest = {
	name: '수정된 워크플로우',
	description: workflowFixture.description,
	nodes: workflowFixture.nodes,
	edges: workflowFixture.edges,
}

const updatedResponse = {
	...workflowDetailResponse,
	data: { ...workflowFixture, name: body.name, version: workflowFixture.version + 1 },
}

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

describe('useUpdateWorkflowMutation', () => {
	beforeEach(() => {
		mocks.update.mockReset()
	})

	it('수정 요청을 workflow id와 본문으로 전송하고 응답으로 상세 캐시를 갱신한다', async () => {
		const queryClient = createTestQueryClient()
		queryClient.setQueryData(queryKeys.workflows.detail('workflow-a'), workflowDetailResponse)
		mocks.update.mockResolvedValueOnce(updatedResponse)
		const { result } = renderHook(() => useUpdateWorkflowMutation('workflow-a'), {
			wrapper: createWrapper(queryClient),
		})

		await act(async () => {
			await result.current.mutateAsync(body)
		})

		expect(mocks.update).toHaveBeenCalledExactlyOnceWith('workflow-a', body)
		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(updatedResponse)
		queryClient.clear()
	})

	it('수정에 성공하면 워크플로우 목록 캐시만 무효화한다', async () => {
		const queryClient = createTestQueryClient()
		const listKey = queryKeys.workflows.list({ size: 20 })
		const otherDetailKey = queryKeys.workflows.detail('workflow-b')
		queryClient.setQueryData(listKey, workflowListResponse)
		queryClient.setQueryData(otherDetailKey, workflowDetailResponse)
		mocks.update.mockResolvedValueOnce(updatedResponse)
		const { result } = renderHook(() => useUpdateWorkflowMutation('workflow-a'), {
			wrapper: createWrapper(queryClient),
		})

		await act(async () => {
			await result.current.mutateAsync(body)
		})

		expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
		expect(queryClient.getQueryState(otherDetailKey)?.isInvalidated).toBe(false)
		queryClient.clear()
	})

	it('수정에 실패하면 기존 상세 캐시를 유지한다', async () => {
		const queryClient = createTestQueryClient()
		const error = new Error('update failed')
		queryClient.setQueryData(queryKeys.workflows.detail('workflow-a'), workflowDetailResponse)
		mocks.update.mockRejectedValueOnce(error)
		const { result } = renderHook(() => useUpdateWorkflowMutation('workflow-a'), {
			wrapper: createWrapper(queryClient),
		})

		await act(async () => {
			await expect(result.current.mutateAsync(body)).rejects.toBe(error)
		})

		expect(queryClient.getQueryData(queryKeys.workflows.detail('workflow-a'))).toEqual(workflowDetailResponse)
		queryClient.clear()
	})
})
