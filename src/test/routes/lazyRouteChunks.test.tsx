import type { ReactNode } from 'react'
import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { createObservedSuccessHandlers, type ApiMockResource } from '@/mocks/apiScenarios'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'

// 분리된 module의 import와 요약 응답이 끝나는 시점을 테스트가 직접 정하기 위해 release 전까지 보류한다.
const chunks = vi.hoisted(() => {
	const createDeferred = () => {
		let release!: () => void
		const ready = new Promise<void>(resolve => {
			release = resolve
		})
		return { ready, release }
	}
	return {
		editor: createDeferred(),
		hero: createDeferred(),
		summaryResponse: createDeferred(),
		requested: vi.fn<(chunk: string) => void>(),
	}
})

vi.mock('@/pages/WorkFlowPage', async () => {
	await chunks.editor.ready
	return { default: () => <h1>워크플로우 편집 page</h1> }
})
vi.mock('@/components/dashboard/DashboardHeroSection', async () => {
	chunks.requested('dashboardHero')
	await chunks.hero.ready
	return { default: () => <section>대시보드 차트 섹션</section> }
})
// 같은 테스트 안에서 route를 이동할 때 exit 애니메이션을 기다리지 않도록 이전 route를 바로 교체한다.
vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	}
})

const countRequests = (requestObserver: ReturnType<typeof vi.fn>, resource: ApiMockResource) =>
	requestObserver.mock.calls.filter(([requestedResource]) => requestedResource === resource).length

const getRouteContent = (pathname: string) => {
	const routeContent = document.querySelector<HTMLElement>(`[data-route-transition="${pathname}"]`)
	expect(routeContent).toBeInTheDocument()
	return routeContent!
}

describe('lazy route chunk', () => {
	it('편집 page chunk를 받는 동안 route별 page shell을 표시하고 상세·편집 데이터를 chunk와 병렬로 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))
		// 편집 page chunk는 파일 안에서 한 번만 풀 수 있으므로, 풀기 전에 두 편집 route의 cold 진입을 각각 확인한다.
		const detailEntry = renderAppRoute(`/workflow/${WORKFLOW_FIXTURE_ID}`)

		expect(
			within(getRouteContent(`/workflow/${WORKFLOW_FIXTURE_ID}`)).getByRole('status', {
				name: '워크플로우 상세 불러오는 중',
			})
		).toBeInTheDocument()
		await waitFor(() => {
			expect(countRequests(observeRequest, 'workflowDetail')).toBe(1)
			expect(countRequests(observeRequest, 'providers')).toBe(1)
			expect(countRequests(observeRequest, 'credentials')).toBe(1)
		})
		detailEntry.dispose()
		observeRequest.mockClear()

		const { router } = renderAppRoute('/workflow/new')

		expect(screen.getByLabelText('사이드바')).toBeInTheDocument()
		expect(
			within(getRouteContent('/workflow/new')).getByRole('status', { name: '워크플로우 편집 화면 불러오는 중' })
		).toBeInTheDocument()
		await waitFor(() => {
			expect(countRequests(observeRequest, 'workflowList')).toBe(1)
			expect(countRequests(observeRequest, 'providers')).toBe(1)
			expect(countRequests(observeRequest, 'credentials')).toBe(1)
		})
		expect(countRequests(observeRequest, 'workflowDetail')).toBe(0)

		await act(async () => router.navigate(`/workflow/${WORKFLOW_FIXTURE_ID}`))

		expect(
			within(getRouteContent(`/workflow/${WORKFLOW_FIXTURE_ID}`)).getByRole('status', {
				name: '워크플로우 상세 불러오는 중',
			})
		).toBeInTheDocument()
		await waitFor(() => expect(countRequests(observeRequest, 'workflowDetail')).toBe(1))

		await act(async () => chunks.editor.release())

		expect(await screen.findByRole('heading', { name: '워크플로우 편집 page' })).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '워크플로우 상세 불러오는 중' })).not.toBeInTheDocument()
	})

	it('대시보드 차트 chunk는 요약 데이터 응답 전에 요청하고, chunk가 늦으면 차트 자리만 fallback으로 유지한다', async () => {
		// 요약 응답을 테스트가 풀어 줄 때까지 보류한다. resolver가 값을 반환하지 않으면 기본 handler가 응답한다.
		server.use(
			http.get('*/api/v1/workflows/dashboard/summary', async () => {
				await chunks.summaryResponse.ready
			})
		)
		renderAppRoute('/main')

		await waitFor(() => expect(chunks.requested).toHaveBeenCalledWith('dashboardHero'))
		expect(screen.getByText('대시보드 요약 불러오는 중')).toBeInTheDocument()

		chunks.summaryResponse.release()
		expect(await screen.findByRole('status', { name: '대시보드 차트 불러오는 중' })).toBeInTheDocument()
		expect(screen.getByText('전체 워크플로우 현황')).toBeInTheDocument()

		await act(async () => chunks.hero.release())

		expect(await screen.findByText('대시보드 차트 섹션')).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '대시보드 차트 불러오는 중' })).not.toBeInTheDocument()
	})
})
