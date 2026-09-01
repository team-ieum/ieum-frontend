import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/createAppQueryClient'
import { queryKeys } from '@/constants/queryKeys'
import {
	createObservedFailureHandlers,
	createObservedSuccessHandlers,
	createPartialFailureHandlers,
	type ApiMockResource,
} from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

const countRequests = (requestObserver: ReturnType<typeof vi.fn>, resource: ApiMockResource) =>
	requestObserver.mock.calls.filter(([requestedResource]) => requestedResource === resource).length

describe('SideBar route data prefetch', () => {
	it('pointer enter와 focus가 route query를 시작하고 반복 의도에서도 요청을 중복하지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const prefetchQuery = vi.spyOn(queryClient, 'prefetchQuery')
		const prefetchInfiniteQuery = vi.spyOn(queryClient, 'prefetchInfiniteQuery')
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest, 40))
		renderAppRoute('/user', { queryClient })

		await waitFor(() => expect(countRequests(observeRequest, 'workflowList')).toBe(1))

		const dashboard = screen.getByRole('button', { name: '대시보드' })
		const workflow = screen.getByRole('button', { name: '워크플로우' })
		const integrations = screen.getByRole('button', { name: '통합 설정' })
		const account = screen.getByRole('button', { name: '계정 설정' })

		fireEvent.pointerEnter(dashboard)
		fireEvent.focus(integrations)
		fireEvent.pointerEnter(workflow)
		fireEvent.pointerEnter(dashboard)
		fireEvent.focus(integrations)

		await waitFor(() => {
			expect(countRequests(observeRequest, 'dashboardSummary')).toBe(1)
			expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(1)
			expect(countRequests(observeRequest, 'dashboardErrors')).toBe(1)
			expect(countRequests(observeRequest, 'oauthConnections')).toBe(1)
			expect(countRequests(observeRequest, 'webhookCredentials')).toBe(1)
			expect(countRequests(observeRequest, 'providers')).toBe(1)
			expect(countRequests(observeRequest, 'credentials')).toBe(1)
		})
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))

		expect(countRequests(observeRequest, 'workflowList')).toBe(1)
		expect(prefetchInfiniteQuery).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: queryKeys.workflows.list({ size: 20 }) })
		)

		const queryPrefetchCount = prefetchQuery.mock.calls.length
		const infinitePrefetchCount = prefetchInfiniteQuery.mock.calls.length
		fireEvent.pointerEnter(account)
		fireEvent.focus(account)

		expect(prefetchQuery).toHaveBeenCalledTimes(queryPrefetchCount)
		expect(prefetchInfiniteQuery).toHaveBeenCalledTimes(infinitePrefetchCount)
	})

	it('운영 retry 설정에서도 실패한 prefetch endpoint를 한 번만 요청한다', async () => {
		const queryClient = createAppQueryClient()
		const observeRequest = vi.fn()
		const resources: ApiMockResource[] = [
			'dashboardSummary',
			'dashboardExecutions',
			'dashboardErrors',
			'oauthConnections',
			'webhookCredentials',
			'providers',
			'credentials',
		]
		server.use(...createObservedFailureHandlers(resources, observeRequest))
		renderAppRoute('/user', { queryClient })

		expect(queryClient.getDefaultOptions().queries?.retry).toBe(3)
		fireEvent.pointerEnter(screen.getByRole('button', { name: '대시보드' }))
		fireEvent.focus(screen.getByRole('button', { name: '통합 설정' }))

		await waitFor(() => {
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardSummary())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardExecutions(20))?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardErrors(20))?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.oauthConnections.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.webhookCredentials.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.providers.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.credentials.list())?.status).toBe('error')
		})
		resources.forEach(resource => expect(countRequests(observeRequest, resource)).toBe(1))
	})

	it('완료된 dashboard prefetch는 navigation 직후 cache 콘텐츠를 표시한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))
		const { router } = renderAppRoute('/user', { queryClient })
		const dashboard = screen.getByRole('button', { name: '대시보드' })

		fireEvent.pointerEnter(dashboard)
		await waitFor(() => {
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardSummary())?.status).toBe('success')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardExecutions(20))?.status).toBe('success')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardErrors(20))?.status).toBe('success')
			expect(queryClient.isFetching()).toBe(0)
		})

		fireEvent.click(dashboard)

		expect(router.state.location.pathname).toBe('/main')
		expect(screen.getByText('총 8개 워크플로우')).toBeInTheDocument()
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument()
		expect(countRequests(observeRequest, 'dashboardSummary')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardErrors')).toBe(1)
	})

	it('진행 중인 prefetch를 기다리지 않고 이동한 뒤 기존 loading UI를 표시한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest, 80))
		const { router } = renderAppRoute('/user', { queryClient })
		const dashboard = screen.getByRole('button', { name: '대시보드' })

		fireEvent.pointerEnter(dashboard)
		await waitFor(() => expect(countRequests(observeRequest, 'dashboardSummary')).toBe(1))
		fireEvent.click(dashboard)

		expect(router.state.location.pathname).toBe('/main')
		expect(screen.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument()
		expect(screen.getAllByText('불러오는 중…').length).toBeGreaterThan(0)
		expect(await screen.findByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(countRequests(observeRequest, 'dashboardSummary')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardErrors')).toBe(1)
	})

	it('실패한 prefetch도 navigation을 막지 않고 page error state로 연결한다', async () => {
		const queryClient = createTestQueryClient()
		server.use(...createPartialFailureHandlers(['dashboardSummary', 'dashboardExecutions', 'dashboardErrors']))
		const { router } = renderAppRoute('/user', { queryClient })
		const dashboard = screen.getByRole('button', { name: '대시보드' })

		fireEvent.pointerEnter(dashboard)
		await waitFor(() => {
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardSummary())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardExecutions(20))?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.workflows.dashboardErrors(20))?.status).toBe('error')
		})
		fireEvent.click(dashboard)

		expect(router.state.location.pathname).toBe('/main')
		expect(await screen.findByText('통계를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('실행 로그를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('오류 목록을 불러오지 못했습니다.')).toBeInTheDocument()
	})
})
