import { act, screen, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import {
	createAllFailureHandlers,
	createDelayedSuccessHandlers,
	createEmptyHandlers,
	createObservedSuccessHandlers,
	createPartialFailureHandlers,
	createResourceApiErrorHandler,
} from '@/mocks/apiScenarios'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

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

const detailPath = `/workflow/${WORKFLOW_FIXTURE_ID}`
const workflowNotFoundCodes = ['WORKFLOW_NOT_FOUND', 'WORKFLOW_DEFINITION_NOT_FOUND', 'NOT_FOUND'] as const

describe('/workflow/:workflowId route harness', () => {
	it('cold 진입에서 shell을 유지하고 HTTP 응답 뒤 실제 editor를 표시한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))

		renderAppRoute(detailPath)

		const skeleton = screen.getByRole('status', { name: '워크플로우 상세 불러오는 중' })
		expect(skeleton.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(5)
		expect(screen.queryByDisplayValue('워크플로우 제목')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '채팅 열기' })).not.toBeInTheDocument()
		expect(await screen.findByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toBeInTheDocument()
	})

	it('offline cold 진입은 pending shell을 유지하고 온라인 복귀 후 editor를 표시한다', async () => {
		let route: ReturnType<typeof renderAppRoute> | undefined

		try {
			onlineManager.setOnline(false)
			const renderedRoute = renderAppRoute(detailPath)
			route = renderedRoute
			await waitFor(() => {
				const detailState = renderedRoute.queryClient.getQueryState(queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID))
				expect(detailState?.status).toBe('pending')
				expect(detailState?.fetchStatus).toBe('paused')
			})
			expect(screen.getByRole('status', { name: '워크플로우 상세 불러오는 중' })).toBeInTheDocument()
			expect(screen.queryByRole('heading', { name: '워크플로우를 불러오지 못했어요' })).not.toBeInTheDocument()

			await act(async () => onlineManager.setOnline(true))

			expect(await screen.findByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		} finally {
			route?.dispose()
			onlineManager.setOnline(true)
		}
	})

	it('warm 재방문은 cache를 즉시 표시하고 stale detail만 refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const { router } = renderAppRoute(detailPath, { queryClient })
		await screen.findByDisplayValue('고객 문의 자동 분류')
		await waitFor(() => {
			expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		})
		await act(async () => router.navigate('/user'))
		server.use(...createDelayedSuccessHandlers(40))
		await act(async () => router.navigate(detailPath))

		expect(screen.getByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.providers.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(0))
	})

	it('empty detail은 null 계약을 만들지 않고 빈 editor document로 재현한다', async () => {
		server.use(...createEmptyHandlers())

		renderAppRoute(detailPath)

		expect(await screen.findByDisplayValue('빈 워크플로우')).toBeInTheDocument()
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toBeInTheDocument()
	})

	it('전체 실패에서 detail query error와 retry shell을 표시한다', async () => {
		server.use(...createAllFailureHandlers())

		const { queryClient } = renderAppRoute(detailPath)

		await waitFor(() =>
			expect(queryClient.getQueryState(queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID))?.status).toBe('error')
		)
		expect(screen.getByRole('heading', { name: '워크플로우를 불러오지 못했어요' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
		expect(screen.queryByDisplayValue('워크플로우 제목')).not.toBeInTheDocument()
		expect(screen.queryByRole('switch', { name: '워크플로우 비활성화' })).not.toBeInTheDocument()
	})

	it('일반 오류 retry는 detail resource를 다시 요청해 editor를 복구한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['workflowDetail']))
		const { queryClient } = renderAppRoute(detailPath)
		await screen.findByRole('heading', { name: '워크플로우를 불러오지 못했어요' })
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))

		server.use(...createObservedSuccessHandlers(observeRequest))
		screen.getByRole('button', { name: '다시 시도' }).click()

		expect(await screen.findByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(observeRequest.mock.calls[0]).toEqual(['workflowDetail'])
		expect(observeRequest.mock.calls.filter(([resource]) => resource === 'workflowDetail')).toHaveLength(1)
		expect(observeRequest.mock.calls.every(([resource]) => ['workflowDetail', 'credentials'].includes(resource))).toBe(true)
	})

	it.each(workflowNotFoundCodes)('%s API code는 목록 이동 action을 표시하고 editor를 마운트하지 않는다', async code => {
		server.use(createResourceApiErrorHandler('workflowDetail', code))

		renderAppRoute(detailPath)

		expect(await screen.findByRole('heading', { name: '워크플로우를 찾을 수 없어요' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '워크플로우 목록으로' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '채팅 열기' })).not.toBeInTheDocument()
	})

	it('cached detail refetch 실패는 title과 editor를 유지하고 비차단 오류를 표시한다', async () => {
		const queryClient = createTestQueryClient()
		renderAppRoute(detailPath, { queryClient })
		await screen.findByDisplayValue('고객 문의 자동 분류')
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		server.use(...createPartialFailureHandlers(['workflowDetail']))

		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })
		})

		expect(screen.getByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()
		expect(await screen.findByText('업데이트하지 못했습니다.')).toBeInTheDocument()
		expect(screen.queryByRole('heading', { name: '워크플로우를 불러오지 못했어요' })).not.toBeInTheDocument()
	})
})
