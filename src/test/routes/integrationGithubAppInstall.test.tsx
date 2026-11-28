import { onlineManager } from '@tanstack/react-query'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { oauthConnectionsResponse, webhookCredentialsResponse } from '@/mocks/fixtures/integrations'
import { MOCK_GITHUB_APP_INSTALL_URL } from '@/mocks/githubAppHandlers'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

const CONNECTION = oauthConnectionsResponse.data[0]
const DETAIL_PATH = `/inter-setting?serviceId=oauth-${CONNECTION.id}`

const useConnection = (provider: 'GITHUB' | 'NOTION') =>
	server.use(
		http.get('*/api/v1/oauth/connections', () =>
			HttpResponse.json({
				...oauthConnectionsResponse,
				data: [{ ...CONNECTION, provider, providerAccountId: `test-${provider.toLowerCase()}-account`, scopes: [] }],
			})
		)
	)

/** 설치 주소 요청을 세고, 응답 순서대로 `responses`를 돌려준다. 마지막 응답은 이후 요청에도 쓴다. */
const mockInstallUrl = (...responses: Array<string | Response>) => {
	const requests = vi.fn()
	server.use(
		http.get('*/api/v1/github/oauth2/install', () => {
			requests()
			const response = responses[Math.min(requests.mock.calls.length, responses.length) - 1]
			return response instanceof Response
				? response
				: HttpResponse.json({ success: true, data: { installUrl: response }, message: 'OK', code: 'OK' })
		})
	)
	return requests
}

describe('GitHub 앱 설치 링크', () => {
	it('GitHub 연결 상세는 레포 접근 범위를 안내하고 같은 탭에서 여는 레포 추가·관리 링크를 둔다', async () => {
		useConnection('GITHUB')
		renderAppRoute(DETAIL_PATH)

		await screen.findByRole('heading', { level: 2, name: 'GitHub' })
		const link = await screen.findByRole('link', { name: '레포 추가·관리' })

		expect(link).toHaveAttribute('href', MOCK_GITHUB_APP_INSTALL_URL)
		expect(link).not.toHaveAttribute('target')
		expect(screen.getByRole('heading', { level: 3, name: '레포 접근 범위' })).toBeInTheDocument()
	})

	it('설치 주소를 기다리는 동안 링크 자리에 불러오는 중 상태를 두고, 응답이 오면 링크로 바꾼다', async () => {
		useConnection('GITHUB')
		let release!: () => void
		const gate = new Promise<void>(resolve => {
			release = resolve
		})
		server.use(
			http.get('*/api/v1/github/oauth2/install', async () => {
				await gate
				return HttpResponse.json({
					success: true,
					data: { installUrl: MOCK_GITHUB_APP_INSTALL_URL },
					message: 'OK',
					code: 'OK',
				})
			})
		)
		renderAppRoute(DETAIL_PATH)

		const loading = await screen.findByRole('status', { name: 'GitHub 앱 설치 주소 불러오는 중' })
		expect(loading).toHaveAttribute('aria-busy', 'true')
		expect(screen.queryByRole('link', { name: '레포 추가·관리' })).not.toBeInTheDocument()

		release()

		expect(await screen.findByRole('link', { name: '레포 추가·관리' })).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: 'GitHub 앱 설치 주소 불러오는 중' })).not.toBeInTheDocument()
	})

	it('오프라인이라 설치 주소 요청이 멈춰도 불러오는 중 자리를 두고, 다시 연결되면 링크를 보여 준다', async () => {
		const requests = mockInstallUrl(MOCK_GITHUB_APP_INSTALL_URL)
		// 오프라인에서도 상세가 열리도록 연결 목록을 캐시에 미리 넣는다. 설치 주소 요청만 멈춘 상태를 만든다.
		const queryClient = createTestQueryClient()
		queryClient.setQueryData(queryKeys.oauthConnections.list(), {
			...oauthConnectionsResponse,
			data: [{ ...CONNECTION, provider: 'GITHUB', providerAccountId: 'test-github-account', scopes: [] }],
		})
		queryClient.setQueryData(queryKeys.webhookCredentials.list(), webhookCredentialsResponse)

		try {
			onlineManager.setOnline(false)
			renderAppRoute(DETAIL_PATH, { queryClient })
			await screen.findByRole('heading', { level: 2, name: 'GitHub' })

			expect(screen.getByRole('status', { name: 'GitHub 앱 설치 주소 불러오는 중' })).toBeInTheDocument()
			expect(requests).not.toHaveBeenCalled()
		} finally {
			await act(async () => onlineManager.setOnline(true))
		}

		expect(await screen.findByRole('link', { name: '레포 추가·관리' })).toHaveAttribute('href', MOCK_GITHUB_APP_INSTALL_URL)
		expect(requests).toHaveBeenCalledTimes(1)
	})

	it('설치 주소를 받지 못하면 오류를 알리고 다시 시도해 링크를 보여 준다', async () => {
		const user = userEvent.setup()
		useConnection('GITHUB')
		const requests = mockInstallUrl(
			HttpResponse.json(
				{ success: false, data: null, message: '서버 오류', code: 'INTERNAL_SERVER_ERROR' },
				{ status: 500 }
			),
			MOCK_GITHUB_APP_INSTALL_URL
		)
		renderAppRoute(DETAIL_PATH)

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent('GitHub 앱 설치 주소를 불러오지 못했어요.')
		await user.click(within(alert).getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByRole('link', { name: '레포 추가·관리' })).toHaveAttribute('href', MOCK_GITHUB_APP_INSTALL_URL)
		expect(requests).toHaveBeenCalledTimes(2)
	})

	it('GitHub이 아닌 OAuth 연결 상세는 설치 주소를 요청하지 않고 레포 추가·관리를 두지 않는다', async () => {
		useConnection('NOTION')
		const requests = mockInstallUrl(MOCK_GITHUB_APP_INSTALL_URL)
		renderAppRoute(DETAIL_PATH)

		await screen.findByRole('heading', { level: 2, name: 'Notion' })

		// 레포 접근 범위 영역은 설치 주소 응답 전에도 바로 그려지므로, 응답을 기다리지 않고도 잘못 그린 경우를 잡는다.
		expect(screen.queryByRole('heading', { level: 3, name: '레포 접근 범위' })).not.toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '레포 추가·관리' })).not.toBeInTheDocument()
		expect(requests).not.toHaveBeenCalled()
	})
})

describe('GitHub 앱 설치 복귀', () => {
	it.each([
		['install', 'GitHub 앱 설치 완료', /GitHub 앱을 설치했어요/],
		['update', '레포 범위 변경 완료', /레포 범위를 바꿨어요/],
		['request', '설치 승인 요청', /조직 관리자에게 GitHub 앱 설치 승인을 요청했어요/],
	])('setup_action=%s로 돌아오면 안내하고 설치 쿼리만 지운다', async (action, title, message) => {
		const { router } = renderAppRoute(`/inter-setting?tab=connected&installation_id=123&setup_action=${action}`)

		const dialog = await screen.findByRole('dialog', { name: title })
		expect(within(dialog).getByText(message)).toBeInTheDocument()
		await waitFor(() => expect(router.state.location.search).toBe('?tab=connected'))
	})
})
