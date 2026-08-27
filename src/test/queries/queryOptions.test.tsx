import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { credentialsQueryOptions, providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import { useProvidersQuery } from '@/hooks/aiCredentials/queries/useProvidersQuery'
import {
	workflowDashboardErrorsQueryOptions,
	workflowDashboardExecutionsQueryOptions,
	workflowDashboardSummaryQueryOptions,
} from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'
import { useWorkflowDashboardErrorsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardErrorsQuery'
import { useWorkflowDashboardExecutionsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardExecutionsQuery'
import { useWorkflowDashboardSummaryQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardSummaryQuery'
import { oauthConnectionsQueryOptions } from '@/hooks/oauthConnections/queries/oauthConnectionsQueryOptions'
import { useOAuthConnectionsQuery } from '@/hooks/oauthConnections/queries/useOAuthConnectionsQuery'
import { useWebhookCredentialsQuery } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import { webhookCredentialsQueryOptions } from '@/hooks/webhookCredentials/queries/webhookCredentialsQueryOptions'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import { workflowListQueryOptions } from '@/hooks/workflow/queries/workflowListQueryOptions'
import { createObservedSuccessHandlers, type ApiMockResource } from '@/mocks/apiScenarios'
import { workflowFixture, workflowListResponse } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

const countRequests = (requestObserver: ReturnType<typeof vi.fn>, resource: ApiMockResource) =>
	requestObserver.mock.calls.filter(([requestedResource]) => requestedResource === resource).length

describe('query option factory', () => {
	it('모든 factory를 prefetch와 hook이 공유하고 fresh cache를 중복 요청하지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))

		await Promise.all([
			queryClient.prefetchQuery(workflowDashboardSummaryQueryOptions()),
			queryClient.prefetchInfiniteQuery(workflowDashboardExecutionsQueryOptions()),
			queryClient.prefetchInfiniteQuery(workflowDashboardErrorsQueryOptions()),
			queryClient.prefetchInfiniteQuery(workflowListQueryOptions()),
			queryClient.prefetchQuery(oauthConnectionsQueryOptions()),
			queryClient.prefetchQuery(webhookCredentialsQueryOptions()),
			queryClient.prefetchQuery(providersQueryOptions()),
			queryClient.prefetchQuery(credentialsQueryOptions()),
		])

		const { result } = renderHook(
			() => ({
				dashboardSummary: useWorkflowDashboardSummaryQuery(),
				dashboardExecutions: useWorkflowDashboardExecutionsQuery(),
				dashboardErrors: useWorkflowDashboardErrorsQuery(),
				workflowList: useWorkflowListQuery(),
				oauthConnections: useOAuthConnectionsQuery(),
				webhookCredentials: useWebhookCredentialsQuery(),
				providers: useProvidersQuery(),
				credentials: useCredentialsQuery(),
			}),
			{ wrapper: createWrapper(queryClient) }
		)

		await waitFor(() => {
			expect(Object.values(result.current).every(query => query.isSuccess)).toBe(true)
		})
		expect(result.current.dashboardSummary.data?.workflowStats.total).toBe(8)
		expect(result.current.oauthConnections.data).toHaveLength(1)
		expect(result.current.webhookCredentials.data).toHaveLength(1)
		for (const resource of [
			'dashboardSummary',
			'dashboardExecutions',
			'dashboardErrors',
			'workflowList',
			'oauthConnections',
			'webhookCredentials',
			'providers',
			'credentials',
		] satisfies ApiMockResource[]) {
			expect(countRequests(observeRequest, resource)).toBe(1)
		}
		queryClient.clear()
	})

	it('workflow infinite query는 cursor를 pageParam으로 사용하고 같은 key에 페이지를 누적한다', async () => {
		const queryClient = createTestQueryClient()
		const requests: Array<{ cursor: string | null; size: string | null }> = []
		server.use(
			http.get('*/api/v1/workflows', ({ request }) => {
				const url = new URL(request.url)
				const cursor = url.searchParams.get('cursor')
				requests.push({ cursor, size: url.searchParams.get('size') })
				if (cursor === 'cursor-2') {
					return HttpResponse.json({
						...workflowListResponse,
						data: {
							...workflowListResponse.data,
							content: [{ ...workflowFixture, id: 'workflow-2', name: '두 번째 워크플로우' }],
							nextCursor: null,
						},
					})
				}
				return HttpResponse.json({
					...workflowListResponse,
					data: { ...workflowListResponse.data, hasNext: true, nextCursor: 'cursor-2' },
				})
			})
		)

		await queryClient.prefetchInfiniteQuery(workflowListQueryOptions())
		const { result } = renderHook(() => useWorkflowListQuery(), { wrapper: createWrapper(queryClient) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(requests).toEqual([{ cursor: null, size: '20' }])

		await act(async () => {
			await result.current.fetchNextPage()
		})

		expect(requests).toEqual([
			{ cursor: null, size: '20' },
			{ cursor: 'cursor-2', size: '20' },
		])
		const cachedData = queryClient.getQueryData(workflowListQueryOptions().queryKey)
		expect(cachedData?.pageParams).toEqual([undefined, 'cursor-2'])
		expect(cachedData?.pages).toHaveLength(2)
		expect(queryClient.getQueryState(queryKeys.workflows.list({ size: 20 }))?.status).toBe('success')
		queryClient.clear()
	})
})
