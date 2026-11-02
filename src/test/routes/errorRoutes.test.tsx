import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/pages/UserPage', () => ({
	default: () => {
		throw new Error('UserPage render failed')
	},
}))

describe('에러 페이지 route', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined)
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('정의되지 않은 경로는 404 페이지를 표시하고 로그인 상태면 홈 버튼으로 /main에 이동한다', async () => {
		const { router } = renderAppRoute('/unknown-path')

		expect(await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
		expect(screen.getByText('404')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '이전 페이지' })).not.toBeInTheDocument()

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
		})

		expect(router.state.location.pathname).toBe('/main')
	})

	it('로그아웃 상태의 404 페이지는 홈 버튼으로 랜딩에 이동한다', async () => {
		const { router } = renderAppRoute('/unknown-path', { auth: null })

		await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' })
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
		})

		expect(router.state.location.pathname).toBe('/')
	})

	it('앱 안에서 이동해 온 404 페이지는 이전 페이지 버튼으로 돌아간다', async () => {
		const { router } = renderAppRoute('/unknown-path')
		await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' })

		await act(async () => router.navigate('/another-unknown'))
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: '이전 페이지' }))
		})

		expect(router.state.location.pathname).toBe('/unknown-path')
	})

	it('레이아웃 하위 화면의 렌더링 오류는 헤더와 사이드바 없이 화면 전체를 에러 페이지로 덮는다', async () => {
		renderAppRoute('/user')

		const heading = await screen.findByRole('heading', { level: 1, name: '문제가 발생했어요' })
		expect(heading.parentElement?.querySelector('img')?.getAttribute('src')).toContain('errorsymbol')
		expect(screen.getByText('500')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '홈으로' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '사이드바 열기' })).not.toBeInTheDocument()
		expect(screen.queryByText('UserPage render failed')).not.toBeInTheDocument()
	})
})
