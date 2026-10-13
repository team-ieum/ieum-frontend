import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { renderAppRoute } from '@/test/renderAppRoute'

// 분리 module의 import가 실패하는 상황(배포 후 이전 chunk 404 등)을 재현한다.
vi.mock('@/pages/WorkFlowPage', () => {
	throw new Error('편집 page chunk 요청 실패')
})
vi.mock('@/components/dashboard/DashboardHeroSection', () => {
	throw new Error('대시보드 차트 chunk 요청 실패')
})
vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

beforeEach(() => {
	// React가 boundary로 잡은 오류를 console에 다시 출력하므로 테스트 출력에서만 숨긴다.
	vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('lazy route chunk 로드 실패', () => {
	it('편집 page chunk를 받지 못하면 Layout을 유지하고 편집 영역에 새로고침 안내를 표시한다', async () => {
		renderAppRoute(`/workflow/${WORKFLOW_FIXTURE_ID}`)

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent('편집 화면을 불러오지 못했어요')
		expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
		expect(screen.getByLabelText('사이드바')).toBeInTheDocument()
	})

	it('대시보드 차트 chunk를 받지 못해도 다른 대시보드 영역은 표시하고 차트 자리에만 안내를 표시한다', async () => {
		renderAppRoute('/main')

		expect(await screen.findByText('차트를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument()
		expect(screen.getByText('전체 워크플로우 현황')).toBeInTheDocument()
	})
})
