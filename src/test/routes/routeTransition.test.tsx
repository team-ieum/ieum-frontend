import type { ReactNode } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	createRouteTransitionVariants,
	getRouteTransitionDirection,
	ROUTE_TRANSITION,
	ROUTE_TRANSITION_MODE,
} from '@/components/routing/routeTransitionMotion'
import { createDelayedSuccessHandlers } from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { setReducedMotion } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('framer-motion', async () => {
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
	}
})

afterEach(() => vi.restoreAllMocks())

const getRouteTransition = (pathname: string) => document.querySelector<HTMLElement>(`[data-route-transition="${pathname}"]`)

const expectSingleRoute = (pathname: string) => {
	expect(getRouteTransition(pathname)).toBeInTheDocument()
	expect(document.querySelectorAll('[data-route-transition]')).toHaveLength(1)
}

describe('보호 route 페이지 전환', () => {
	it('최초 진입에 6px enter와 160ms 순차 transition 설정을 적용한다', () => {
		renderAppRoute('/main')
		const transition = getRouteTransition('/main')

		expect(transition).toHaveStyle({ opacity: '0', transform: 'translateY(6px)' })
		expect(transition?.parentElement).toHaveClass('grid')
		expect(ROUTE_TRANSITION_MODE).toBe('wait')
		expect(ROUTE_TRANSITION).toEqual({ duration: 0.16, ease: 'easeOut' })
		const variants = createRouteTransitionVariants(false)
		expect(variants.initial(getRouteTransitionDirection(null, '/main'))).toEqual({
			opacity: 0,
			x: 0,
			y: 6,
		})
	})

	it('사이드바 순서에 따라 서로 반대인 세로 enter와 exit 방향을 만든다', () => {
		const variants = createRouteTransitionVariants(false)
		const upward = getRouteTransitionDirection('/workflow', '/main')
		const downward = getRouteTransitionDirection('/workflow', '/inter-setting')

		expect(upward).toEqual({ axis: 'y', direction: -1 })
		expect(variants.initial(upward)).toEqual({ opacity: 0, x: 0, y: -6 })
		expect(variants.exit(upward)).toEqual({ opacity: 0, x: 0, y: 6 })
		expect(downward).toEqual({ axis: 'y', direction: 1 })
		expect(variants.initial(downward)).toEqual({ opacity: 0, x: 0, y: 6 })
		expect(variants.exit(downward)).toEqual({ opacity: 0, x: 0, y: -6 })
	})

	it('워크플로우 목록과 상세 사이에는 좌우 enter와 exit 방향을 만든다', () => {
		const variants = createRouteTransitionVariants(false)
		const detailPath = '/workflow/11111111-1111-4111-8111-111111111111'
		const enterDetail = getRouteTransitionDirection('/workflow', detailPath)
		const returnToList = getRouteTransitionDirection(detailPath, '/workflow')

		expect(enterDetail).toEqual({ axis: 'x', direction: 1 })
		expect(variants.initial(enterDetail)).toEqual({ opacity: 0, x: 6, y: 0 })
		expect(variants.exit(enterDetail)).toEqual({ opacity: 0, x: -6, y: 0 })
		expect(returnToList).toEqual({ axis: 'x', direction: -1 })
		expect(variants.initial(returnToList)).toEqual({ opacity: 0, x: -6, y: 0 })
		expect(variants.exit(returnToList)).toEqual({ opacity: 0, x: 6, y: 0 })
	})

	it('지연 응답 중 pathname 교체 후 incoming route의 skeleton을 표시한다', async () => {
		server.use(...createDelayedSuccessHandlers(1_000))
		const { router } = renderAppRoute('/user')
		expectSingleRoute('/user')

		await act(async () => router.navigate('/main'))

		expectSingleRoute('/main')
		expect(screen.getByText('대시보드 요약 불러오는 중')).toBeInTheDocument()
	})

	it('빠른 연속 이동 뒤 마지막 pathname만 유지한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))
		const { router } = renderAppRoute('/main')
		expectSingleRoute('/main')

		await act(async () => {
			void router.navigate('/workflow')
			void router.navigate('/inter-setting')
		})

		await waitFor(() => expect(router.state.location.pathname).toBe('/inter-setting'))
		expectSingleRoute('/inter-setting')
		expect(screen.getByRole('heading', { level: 1, name: '통합 설정' })).toBeInTheDocument()
	})

	it('서로 다른 pathname을 browser back과 forward로 복원한다', async () => {
		const { router } = renderAppRoute('/main')
		expectSingleRoute('/main')
		await act(async () => router.navigate('/workflow'))
		expectSingleRoute('/workflow')

		await act(async () => router.navigate(-1))
		expectSingleRoute('/main')

		await act(async () => router.navigate(1))
		expectSingleRoute('/workflow')
	})

	it('search parameter 변경은 현재 route wrapper를 유지한다', async () => {
		const { router } = renderAppRoute('/workflow')
		expectSingleRoute('/workflow')
		const transition = getRouteTransition('/workflow')

		await act(async () => router.navigate('/workflow?view=row'))

		expect(router.state.location.search).toBe('?view=row')
		expect(getRouteTransition('/workflow')).toBe(transition)
		expect(document.querySelectorAll('[data-route-transition]')).toHaveLength(1)
	})

	it('사이드바 focus와 기존 scroll 정책을 변경하지 않는다', async () => {
		const scrollTo = vi.spyOn(window, 'scrollTo')
		renderAppRoute('/main')
		expectSingleRoute('/main')
		const workflowButton = screen.getByRole('button', { name: '워크플로우' })
		workflowButton.focus()

		fireEvent.click(workflowButton)

		expectSingleRoute('/workflow')
		expect(workflowButton).toHaveFocus()
		expect(scrollTo).not.toHaveBeenCalled()
	})

	it('reduced-motion에서는 enter와 exit의 이동을 제거하고 opacity를 유지한다', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		setReducedMotion(true)
		renderAppRoute('/main')

		expect(getRouteTransition('/main')).toHaveStyle({ opacity: '0', transform: 'none' })
		const variants = createRouteTransitionVariants(true)
		const horizontal = getRouteTransitionDirection('/workflow', '/workflow/new')
		expect(variants.initial(horizontal)).toEqual({ opacity: 0, x: 0, y: 0 })
		expect(variants.exit(horizontal)).toEqual({ opacity: 0, x: 0, y: 0 })
	})
})
