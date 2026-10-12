import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preloadWorkflowEditorPage } from '@/app/lazyModules'
import { renderAppRoute } from '@/test/renderAppRoute'

// mock factory는 module이 처음 import될 때 한 번 실행되므로, 호출 여부로 chunk 요청 시작을 관찰한다.
const requestedChunks = vi.hoisted(() => vi.fn<(chunk: 'workflowEditor' | 'dashboardHero') => void>())

vi.mock('@/pages/WorkFlowPage', () => {
	requestedChunks('workflowEditor')
	return { default: () => null }
})
vi.mock('@/components/dashboard/DashboardHeroSection', () => {
	requestedChunks('dashboardHero')
	return { default: () => null }
})
vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

// 한 번 받은 chunk는 module cache에 남아 factory가 다시 실행되지 않는다. 그래서 테스트는 선언 순서에 의존하며,
// 각 메뉴 테스트는 서로 다른 chunk의 첫 요청만 관찰한다. 같은 편집 page chunk를 쓰는 컨트롤은 preload 함수 호출로 연결만 확인한다.
vi.mock('@/app/lazyModules', async importOriginal => {
	const actual = await importOriginal<typeof import('@/app/lazyModules')>()
	return { ...actual, preloadWorkflowEditorPage: vi.fn(actual.preloadWorkflowEditorPage) }
})

beforeEach(() => {
	requestedChunks.mockClear()
	vi.mocked(preloadWorkflowEditorPage).mockClear()
})

const flushImports = () => new Promise(resolve => setTimeout(resolve, 20))

describe('SideBar route chunk preload', () => {
	it('분리 chunk가 없는 메뉴의 의도에서는 chunk를 요청하지 않는다', async () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('link', { name: '통합 설정' }))
		fireEvent.focus(screen.getByRole('link', { name: '계정 설정' }))
		await flushImports()

		expect(requestedChunks).not.toHaveBeenCalled()
	})

	it('대시보드 메뉴 hover는 hero 차트 chunk를 미리 요청한다', async () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('link', { name: '대시보드' }))

		await waitFor(() => expect(requestedChunks).toHaveBeenCalledWith('dashboardHero'))
		expect(requestedChunks).not.toHaveBeenCalledWith('workflowEditor')
	})

	it('워크플로우 메뉴 focus는 편집 page chunk를 미리 요청한다', async () => {
		renderAppRoute('/user')

		fireEvent.focus(screen.getByRole('link', { name: '워크플로우' }))

		await waitFor(() => expect(requestedChunks).toHaveBeenCalledWith('workflowEditor'))
		// hero chunk는 앞 테스트에서 이미 받아 factory가 다시 실행되지 않으므로, 요청하지 않는다는 단언은 항상 통과한다. 검증하지 않는다.
	})

	it('새 캔버스 hover는 편집 page preload를 호출한다', async () => {
		renderAppRoute('/user')

		fireEvent.pointerEnter(screen.getByRole('button', { name: /새 캔버스/ }))

		expect(preloadWorkflowEditorPage).toHaveBeenCalledTimes(1)
	})

	it('최근 작업 focus는 편집 page preload를 호출한다', async () => {
		renderAppRoute('/user')

		fireEvent.focus(await screen.findByRole('button', { name: /고객 문의 자동 분류/ }))

		expect(preloadWorkflowEditorPage).toHaveBeenCalledTimes(1)
	})
})
