import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preloadDashboardHeroSection, preloadWorkflowEditorPage } from '@/app/lazyModules'
import { renderAppRoute } from '@/test/renderAppRoute'

// chunk import 대신 preloader 호출을 관찰한다. 실제 import는 module cache에 남아 테스트 간 격리가 되지 않는다.
vi.mock('@/app/lazyModules', async importOriginal => {
	const actual = await importOriginal<typeof import('@/app/lazyModules')>()
	return { ...actual, preloadDashboardHeroSection: vi.fn(), preloadWorkflowEditorPage: vi.fn() }
})
vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

beforeEach(() => {
	vi.mocked(preloadDashboardHeroSection).mockClear()
	vi.mocked(preloadWorkflowEditorPage).mockClear()
})

describe('SideBar route chunk preload', () => {
	it('대시보드 메뉴 hover는 대시보드 차트 preloader만 호출한다', () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('link', { name: '대시보드' }))

		expect(preloadDashboardHeroSection).toHaveBeenCalledTimes(1)
		expect(preloadWorkflowEditorPage).not.toHaveBeenCalled()
	})

	it('워크플로우 메뉴 focus는 편집 page preloader만 호출한다', () => {
		renderAppRoute('/user')

		fireEvent.focus(screen.getByRole('link', { name: '워크플로우' }))

		expect(preloadWorkflowEditorPage).toHaveBeenCalledTimes(1)
		expect(preloadDashboardHeroSection).not.toHaveBeenCalled()
	})

	it('분리 chunk가 없는 메뉴의 의도에서는 preloader를 호출하지 않는다', () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('link', { name: '통합 설정' }))
		fireEvent.focus(screen.getByRole('link', { name: '계정 설정' }))

		expect(preloadDashboardHeroSection).not.toHaveBeenCalled()
		expect(preloadWorkflowEditorPage).not.toHaveBeenCalled()
	})

	it('새 캔버스 hover는 편집 page preloader를 호출한다', () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('button', { name: /새 캔버스/ }))

		expect(preloadWorkflowEditorPage).toHaveBeenCalledTimes(1)
	})

	it('최근 작업 focus는 편집 page preloader를 호출한다', async () => {
		renderAppRoute('/user')

		fireEvent.focus(await screen.findByRole('button', { name: /고객 문의 자동 분류/ }))

		expect(preloadWorkflowEditorPage).toHaveBeenCalledTimes(1)
	})
})
