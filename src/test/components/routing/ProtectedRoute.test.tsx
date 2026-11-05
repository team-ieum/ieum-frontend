import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/useAuthStore'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('@/components/routing/RouteTransition', async () => {
	const { Outlet } = await import('react-router')
	return { RouteTransition: Outlet }
})

describe('ProtectedRoute', () => {
	it('토큰 없이 들어오면 로그인 화면으로 보내고 로그인이 필요하다고 안내한다', async () => {
		const { router } = renderAppRoute('/user', { auth: null })

		expect(await screen.findByRole('heading', { name: '로그인 필요' })).toBeInTheDocument()
		expect(router.state.location.pathname).toBe('/auth')
	})

	it('로그인한 채 머무르다 토큰이 지워지면 로그인 화면으로만 보내고 안내는 지운 쪽에 맡긴다', async () => {
		const { router } = renderAppRoute('/user')
		await screen.findByLabelText('닉네임')

		act(() => useAuthStore.getState().clearAuth())

		expect(router.state.location.pathname).toBe('/auth')
		expect(screen.queryByRole('heading', { name: '로그인 필요' })).not.toBeInTheDocument()
	})
})
