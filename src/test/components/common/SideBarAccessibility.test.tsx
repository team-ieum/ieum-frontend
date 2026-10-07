import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { setViewportWidth } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

const MOBILE_WIDTH = 390

const getSidebar = () => screen.getByRole('complementary', { name: '사이드바' })
const getMainNavigation = () => screen.getByRole('navigation', { name: '주요 메뉴' })

describe('SideBar 내비게이션 접근성', () => {
	it('주요 메뉴를 링크로 제공하고 현재 route에만 aria-current="page"를 적용한다', async () => {
		const user = userEvent.setup()
		const { router } = renderAppRoute('/workflow?view=row')
		const navigation = getMainNavigation()

		expect(within(navigation).getByRole('link', { name: '워크플로우' })).toHaveAttribute('aria-current', 'page')
		expect(within(navigation).getByRole('link', { name: '대시보드' })).not.toHaveAttribute('aria-current')
		expect(within(navigation).getByRole('link', { name: '통합 설정' })).toHaveAttribute('href', '/inter-setting')

		await user.click(within(navigation).getByRole('link', { name: '통합 설정' }))

		expect(router.state.location.pathname).toBe('/inter-setting')
		expect(within(navigation).getByRole('link', { name: '통합 설정' })).toHaveAttribute('aria-current', 'page')
		expect(within(navigation).getByRole('link', { name: '워크플로우' })).not.toHaveAttribute('aria-current')
	})

	it('keyboard Enter로 메뉴 링크를 이동한다', async () => {
		const user = userEvent.setup()
		const { router } = renderAppRoute('/user')

		within(getMainNavigation()).getByRole('link', { name: '대시보드' }).focus()
		await user.keyboard('{Enter}')

		expect(router.state.location.pathname).toBe('/main')
	})

	it('접힌 사이드바에서도 아이콘 메뉴와 새 캔버스 버튼의 접근 이름을 유지한다', async () => {
		const user = userEvent.setup()
		renderAppRoute('/user')

		await user.click(screen.getByRole('button', { name: '사이드바 접기' }))

		const navigation = getMainNavigation()
		for (const label of ['대시보드', '워크플로우', '통합 설정', '계정 설정']) {
			expect(within(navigation).getByRole('link', { name: label })).toBeInTheDocument()
		}
		expect(within(getSidebar()).getByRole('button', { name: '새 캔버스' })).toBeInTheDocument()
	})

	it('desktop viewport에서는 닫힘 상태와 관계없이 사이드바를 inert로 만들지 않는다', () => {
		renderAppRoute('/user')

		expect(getSidebar()).not.toHaveAttribute('inert')
	})
})

describe('모바일 off-canvas 사이드바', () => {
	it('닫혀 있는 동안 inert이고 메뉴 버튼이 aria-expanded와 aria-controls로 상태를 전달한다', async () => {
		setViewportWidth(MOBILE_WIDTH)
		const user = userEvent.setup()
		renderAppRoute('/user')
		const menuButton = screen.getByRole('button', { name: '사이드바 열기' })

		expect(getSidebar()).toHaveAttribute('inert')
		expect(menuButton).toHaveAttribute('aria-expanded', 'false')
		expect(menuButton).toHaveAttribute('aria-controls', getSidebar().id)

		await user.click(menuButton)

		expect(getSidebar()).not.toHaveAttribute('inert')
		expect(menuButton).toHaveAttribute('aria-expanded', 'true')
		expect(within(getSidebar()).getByRole('button', { name: '사이드바 닫기' })).toHaveFocus()
	})

	it('Escape로 닫고 메뉴 버튼으로 focus를 되돌린다', async () => {
		setViewportWidth(MOBILE_WIDTH)
		const user = userEvent.setup()
		renderAppRoute('/user')
		const menuButton = screen.getByRole('button', { name: '사이드바 열기' })

		await user.click(menuButton)
		await user.keyboard('{Escape}')

		expect(getSidebar()).toHaveAttribute('inert')
		expect(menuButton).toHaveAttribute('aria-expanded', 'false')
		expect(menuButton).toHaveFocus()
	})

	it('닫기 버튼으로 닫으면 메뉴 버튼으로 focus를 되돌린다', async () => {
		setViewportWidth(MOBILE_WIDTH)
		const user = userEvent.setup()
		renderAppRoute('/user')
		const menuButton = screen.getByRole('button', { name: '사이드바 열기' })

		await user.click(menuButton)
		await user.click(within(getSidebar()).getByRole('button', { name: '사이드바 닫기' }))

		expect(getSidebar()).toHaveAttribute('inert')
		expect(menuButton).toHaveFocus()
	})

	it('메뉴 링크를 선택하면 이동하면서 사이드바를 닫는다', async () => {
		setViewportWidth(MOBILE_WIDTH)
		const user = userEvent.setup()
		const { router } = renderAppRoute('/user')

		await user.click(screen.getByRole('button', { name: '사이드바 열기' }))
		await user.click(within(getMainNavigation()).getByRole('link', { name: '대시보드' }))

		expect(router.state.location.pathname).toBe('/main')
		expect(getSidebar()).toHaveAttribute('inert')
	})
})
