import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useIntegrationServiceWorkflowListViewModel } from '@/hooks/integration/useIntegrationServiceWorkflowListViewModel'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationBrand } from '@/types/integration'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'

const WORKFLOWS_PATH = '*/api/v1/integrations/:serviceType/workflows'

const createWorkflow = (overrides: Partial<IntegrationServiceWorkflowDto>): IntegrationServiceWorkflowDto => ({
	id: 'workflow-1',
	name: '워크플로우 1',
	description: '',
	active: true,
	triggerType: 'MANUAL',
	usedNodeCount: 1,
	updatedAt: '2026-10-26T00:00:00Z',
	...overrides,
})

const createPage = (content: IntegrationServiceWorkflowDto[], nextCursor: string | null) =>
	HttpResponse.json({
		success: true,
		code: 'SUCCESS',
		message: 'ok',
		data: { content, size: 20, hasNext: nextCursor !== null, nextCursor },
	})

const createWrapper = (queryClient: QueryClient) =>
	function Wrapper({ children }: PropsWithChildren) {
		return (
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/inter-setting']}>{children}</MemoryRouter>
			</QueryClientProvider>
		)
	}

const renderViewModel = (brand: IntegrationBrand) => {
	const queryClient = createTestQueryClient()
	const rendered = renderHook(
		() => ({ viewModel: useIntegrationServiceWorkflowListViewModel(brand), location: useLocation() }),
		{ wrapper: createWrapper(queryClient) }
	)
	return { ...rendered, queryClient }
}

describe('useIntegrationServiceWorkflowListViewModel', () => {
	it('다음 페이지를 이어 붙이고 트리거와 활성 여부를 화면 값으로 변환한다', async () => {
		const observeRequest = vi.fn()
		server.use(
			http.get(WORKFLOWS_PATH, ({ params, request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				observeRequest(params.serviceType, cursor)
				return cursor === 'cursor-2'
					? createPage([createWorkflow({ id: 'workflow-2', triggerType: 'unknown_trigger', active: false })], null)
					: createPage([createWorkflow({ id: 'workflow-1', triggerType: 'gmail_new_email' })], 'cursor-2')
			})
		)
		const { result, queryClient } = renderViewModel('gmail')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))
			expect(result.current.viewModel.isSupportedService).toBe(true)
			expect(result.current.viewModel.hasNextPage).toBe(true)
			expect(result.current.viewModel.workflows[0]).toEqual(
				expect.objectContaining({ id: 'workflow-1', isActive: true, triggerLabel: 'Gmail 메일' })
			)

			act(() => result.current.viewModel.handleLoadMore())
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(2))

			expect(result.current.viewModel.workflows[1]).toEqual(
				expect.objectContaining({ id: 'workflow-2', isActive: false, triggerLabel: 'unknown_trigger' })
			)
			expect(result.current.viewModel.hasNextPage).toBe(false)
			expect(observeRequest.mock.calls).toEqual([
				['GOOGLE', null],
				['GOOGLE', 'cursor-2'],
			])
		} finally {
			queryClient.clear()
		}
	})

	it('다음 페이지 요청이 실패해도 불러온 목록을 유지하고 다시 시도로 이어서 불러온다', async () => {
		let shouldFailNextPage = true
		server.use(
			http.get(WORKFLOWS_PATH, ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				if (cursor === null) return createPage([createWorkflow({ id: 'workflow-1' })], 'cursor-2')
				if (shouldFailNextPage) return new HttpResponse(null, { status: 500 })
				return createPage([createWorkflow({ id: 'workflow-2' })], null)
			})
		)
		const { result, queryClient } = renderViewModel('github')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))

			act(() => result.current.viewModel.handleLoadMore())
			await waitFor(() => expect(result.current.viewModel.isFetchNextPageError).toBe(true))

			expect(result.current.viewModel.workflows.map(workflow => workflow.id)).toEqual(['workflow-1'])
			expect(result.current.viewModel.hasNextPage).toBe(true)
			expect(result.current.viewModel.resource.isLoadingError).toBe(false)
			expect(result.current.viewModel.resource.isRefetchError).toBe(false)

			shouldFailNextPage = false
			act(() => result.current.viewModel.handleLoadMore())
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(2))
			expect(result.current.viewModel.isFetchNextPageError).toBe(false)
		} finally {
			queryClient.clear()
		}
	})

	it('첫 페이지 조회가 실패하면 목록 전체 오류로 표시하고 retry로 다시 조회한다', async () => {
		let shouldFail = true
		server.use(
			http.get(WORKFLOWS_PATH, () =>
				shouldFail ? new HttpResponse(null, { status: 500 }) : createPage([createWorkflow({ id: 'workflow-1' })], null)
			)
		)
		const { result, queryClient } = renderViewModel('notion')

		try {
			await waitFor(() => expect(result.current.viewModel.resource.isLoadingError).toBe(true))
			expect(result.current.viewModel.workflows).toEqual([])
			expect(result.current.viewModel.isFetchNextPageError).toBe(false)

			shouldFail = false
			act(() => result.current.viewModel.resource.retry())

			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))
			expect(result.current.viewModel.resource.isLoadingError).toBe(false)
		} finally {
			queryClient.clear()
		}
	})

	it('목록을 다시 조회하는 중에는 retry를 다시 호출해도 새 요청을 보내지 않는다', async () => {
		const observeRequest = vi.fn()
		let releaseRefetch: (() => void) | null = null
		server.use(
			http.get(WORKFLOWS_PATH, async () => {
				observeRequest()
				if (observeRequest.mock.calls.length > 1) {
					// 재조회 응답을 붙잡아 진행 중 상태에서 retry를 호출한다.
					await new Promise<void>(resolve => {
						releaseRefetch = resolve
					})
				}
				return createPage([createWorkflow({ id: 'workflow-1' })], null)
			})
		)
		const { result, queryClient } = renderViewModel('discord')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))

			act(() => result.current.viewModel.resource.retry())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetching).toBe(true))
			act(() => result.current.viewModel.resource.retry())

			expect(observeRequest).toHaveBeenCalledTimes(2)
			act(() => releaseRefetch?.())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetching).toBe(false))
			expect(observeRequest).toHaveBeenCalledTimes(2)
		} finally {
			queryClient.clear()
		}
	})

	// 다음 페이지 실패로 query가 오류 상태인 채 mount·reconnect 재조회가 시작되면 TanStack Query는 isRefetchError를 true로 둔다.
	it('다음 페이지 실패 뒤 사용자가 재시도하지 않은 재조회는 갱신 실패로 표시하지 않는다', async () => {
		let releaseRefetch: (() => void) | null = null
		let firstPageRequestCount = 0
		server.use(
			http.get(WORKFLOWS_PATH, async ({ request }) => {
				const cursor = new URL(request.url).searchParams.get('cursor')
				if (cursor !== null) return new HttpResponse(null, { status: 500 })
				firstPageRequestCount += 1
				if (firstPageRequestCount > 1) {
					await new Promise<void>(resolve => {
						releaseRefetch = resolve
					})
				}
				return createPage([createWorkflow({ id: 'workflow-1' })], 'cursor-2')
			})
		)
		const { result, queryClient } = renderViewModel('slack')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))
			act(() => result.current.viewModel.handleLoadMore())
			await waitFor(() => expect(result.current.viewModel.isFetchNextPageError).toBe(true))

			act(() => void queryClient.refetchQueries())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetching).toBe(true))

			expect(result.current.viewModel.resource.isRefetchError).toBe(false)
			expect(result.current.viewModel.isFetchNextPageError).toBe(false)

			act(() => releaseRefetch?.())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetching).toBe(false))
			expect(result.current.viewModel.resource.isRefetchError).toBe(false)
		} finally {
			queryClient.clear()
		}
	})

	it('갱신 실패 뒤 retry로 다시 조회하는 동안에는 갱신 실패 상태를 유지한다', async () => {
		let mode: 'success' | 'failure' | 'held' = 'success'
		let releaseRefetch: (() => void) | null = null
		server.use(
			http.get(WORKFLOWS_PATH, async () => {
				if (mode === 'failure') return new HttpResponse(null, { status: 500 })
				if (mode === 'held') {
					await new Promise<void>(resolve => {
						releaseRefetch = resolve
					})
				}
				return createPage([createWorkflow({ id: 'workflow-1' })], null)
			})
		)
		const { result, queryClient } = renderViewModel('github')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))

			mode = 'failure'
			act(() => void queryClient.refetchQueries())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetchError).toBe(true))

			mode = 'held'
			act(() => result.current.viewModel.resource.retry())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetching).toBe(true))
			expect(result.current.viewModel.resource.isRefetchError).toBe(true)

			act(() => releaseRefetch?.())
			await waitFor(() => expect(result.current.viewModel.resource.isRefetchError).toBe(false))
			expect(result.current.viewModel.workflows).toHaveLength(1)
		} finally {
			queryClient.clear()
		}
	})

	it('serviceType으로 바꿀 수 없는 brand는 조회하지 않는다', () => {
		const observeRequest = vi.fn()
		server.use(
			http.get(WORKFLOWS_PATH, () => {
				observeRequest()
				return createPage([], null)
			})
		)
		const { result, queryClient } = renderViewModel('jira')

		try {
			expect(result.current.viewModel.isSupportedService).toBe(false)
			expect(result.current.viewModel.resource.isLoading).toBe(false)
			expect(result.current.viewModel.workflows).toEqual([])
			expect(observeRequest).not.toHaveBeenCalled()
		} finally {
			queryClient.clear()
		}
	})

	it('워크플로우를 열면 편집기 경로로 이동하며 이름을 route state로 넘긴다', async () => {
		server.use(http.get(WORKFLOWS_PATH, () => createPage([createWorkflow({ id: 'workflow-9', name: '알림 보내기' })], null)))
		const { result, queryClient } = renderViewModel('slack')

		try {
			await waitFor(() => expect(result.current.viewModel.workflows).toHaveLength(1))

			act(() => result.current.viewModel.handleOpenWorkflow(result.current.viewModel.workflows[0]))

			await waitFor(() => expect(result.current.location.pathname).toBe('/workflow/workflow-9'))
			expect(result.current.location.state).toEqual({ name: '알림 보내기' })
		} finally {
			queryClient.clear()
		}
	})
})
