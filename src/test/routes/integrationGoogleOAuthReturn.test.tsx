import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { emptyOAuthConnectionsResponse, oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/stores/useAuthStore'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

const setupOAuthReturn = (path: string) => {
	const observeConnections = vi.fn()
	server.use(
		http.get('*/api/v1/oauth/connections', () => {
			observeConnections()
			return HttpResponse.json(oauthConnectionsResponse)
		})
	)
	const auth = { accessToken: 'test-existing-access', refreshToken: 'test-existing-refresh' }
	const queryClient = createTestQueryClient()
	queryClient.setQueryData(queryKeys.oauthConnections.list(), emptyOAuthConnectionsResponse)
	const { router } = renderAppRoute(path, { auth, queryClient })
	return { auth, observeConnections, router }
}

describe('Google 연동 OAuth 복귀', () => {
	it.each([
		['/oauth2/callback?linked=google', ''],
		['/inter-setting?linked=google&source=test', '?source=test'],
	])('%s에서 연결 목록을 갱신하고 기존 세션을 유지한다', async (path, search) => {
		const { auth, observeConnections, router } = setupOAuthReturn(path)

		expect(await screen.findByText('Google 계정이 연결되었습니다.')).toBeInTheDocument()
		expect(await screen.findByRole('heading', { level: 3, name: 'Google' })).toBeInTheDocument()
		expect(observeConnections).toHaveBeenCalledOnce()
		expect(router.state.location).toMatchObject({ pathname: '/inter-setting', search })
		expect(useAuthStore.getState()).toMatchObject(auth)
	})

	it('연동 완료 표시 없이 돌아온 로그인 인가 코드는 연결 알림이나 세션 변경을 일으키지 않는다', async () => {
		const { auth, observeConnections, router } = setupOAuthReturn('/oauth2/callback?provider=google&code=oauth-code')

		expect(await screen.findByRole('heading', { level: 1, name: '통합 설정' })).toBeInTheDocument()
		expect(screen.queryByText('Google 계정이 연결되었습니다.')).not.toBeInTheDocument()
		expect(observeConnections).not.toHaveBeenCalled()
		expect(router.state.location).toMatchObject({ pathname: '/inter-setting', search: '' })
		expect(useAuthStore.getState()).toMatchObject(auth)
	})
})
