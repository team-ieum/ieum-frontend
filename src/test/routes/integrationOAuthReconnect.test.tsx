import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createResourceHoldHandler } from '@/mocks/apiScenarios'
import { oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import type { OAuthConnectionDto } from '@/types/oauthConnections'

const RECONNECT_CASES = [
	{
		label: 'GitHub',
		provider: 'GITHUB',
		serviceType: 'github',
		isAlreadyDisconnected: false,
		notice: /GitHub 앱은 설치된 채로 남아요\. GitHub 설정 > Applications에서 따로 삭제할 수 있어요/,
		authorizeUrl: 'https://github.com/login/oauth/authorize?client_id=ieum-test',
	},
	{
		label: 'Notion',
		provider: 'NOTION',
		serviceType: 'notion',
		isAlreadyDisconnected: true,
		notice: /Notion에도 이음의 접근 권한을 취소해 달라고 요청해요/,
		authorizeUrl: 'https://api.notion.com/v1/oauth/authorize?client_id=ieum-test',
	},
] as const

const findCard = async (label: string) => {
	const heading = await screen.findByRole('heading', { level: 3, name: label })
	const card = heading.closest('article')
	if (!card) throw new Error(`${label} 카드가 없습니다.`)
	return card
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

describe('공용 OAuth 연동 해제 후 재연결', () => {
	it.each(RECONNECT_CASES)('$label 해제를 확인하면 목록을 갱신하고 복원된 타일에서 다시 연결한다', async config => {
		const { label, provider, serviceType, isAlreadyDisconnected, notice, authorizeUrl } = config
		const user = userEvent.setup()
		const assign = vi.fn()
		vi.stubGlobal('location', { ...window.location, assign })
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		const connection = {
			id: '44444444-4444-4444-8444-444444444444',
			provider,
			providerAccountId: `test-${serviceType}-account`,
			displayName: null,
			scopes: [],
			createdAt: '2026-08-24T03:00:00Z',
		} satisfies OAuthConnectionDto
		let isConnected = true
		const listConnections = vi.fn()
		const getWorkflows = vi.fn()
		const deleteConnection = vi.fn()
		const requestAuthorize = vi.fn()
		const alreadyDisconnectedMessage = '연동된 계정이 없습니다.'
		server.use(
			http.get('*/api/v1/oauth/connections', () => {
				listConnections(isConnected)
				return HttpResponse.json({
					...oauthConnectionsResponse,
					data: isConnected ? [...oauthConnectionsResponse.data, connection] : oauthConnectionsResponse.data,
				})
			}),
			http.get('*/api/v1/integrations/:serviceType/workflows', ({ params, request }) => {
				const size = new URL(request.url).searchParams.get('size')
				getWorkflows(params.serviceType, size)
				return HttpResponse.json({
					success: true,
					data: { content: [], size: 100, hasNext: false, nextCursor: null },
					message: 'success',
					code: 'SUCCESS',
				})
			}),
			http.delete('*/api/v1/oauth/connections/:provider', async ({ params, request }) => {
				deleteConnection(params.provider, await request.text())
				if (!isConnected) {
					return HttpResponse.json(
						{ success: false, data: null, message: alreadyDisconnectedMessage, code: 'ACCOUNT_NOT_CONNECTED' },
						{ status: 400 }
					)
				}
				isConnected = false
				return HttpResponse.json({ success: true, data: null, message: 'success', code: 'SUCCESS' })
			}),
			http.get(`*/api/v1/${serviceType}/oauth2/authorize`, () => {
				requestAuthorize()
				return HttpResponse.json({ success: true, data: { authorizationUrl: authorizeUrl }, message: 'OK', code: 'OK' })
			})
		)
		renderAppRoute('/inter-setting')

		const connectedCard = await findCard(label)
		const opener = within(connectedCard).getByRole('button', { name: '연결 해제' })
		await user.click(opener)
		const dialog = await screen.findByRole('alertdialog', { name: '연결 해제' })
		const confirm = await within(dialog).findByRole('button', { name: '연결 해제' })
		expect(dialog).toHaveTextContent(notice)
		expect(dialog).toHaveTextContent('이 연결을 쓰는 워크플로우는 없어요.')
		expect(getWorkflows).toHaveBeenCalledExactlyOnceWith(serviceType, '100')
		expect(deleteConnection).not.toHaveBeenCalled()
		// 해제가 끝나도 목록 재조회가 느리면 연 버튼이 남아 있다. 이때도 포커스는 사용 가능한 서비스로 돌아간다.
		let releaseList!: () => void
		const listResponse = new Promise<void>(resolve => {
			releaseList = resolve
		})
		server.use(createResourceHoldHandler('oauthConnections', listResponse))
		const available = screen.getByRole('region', { name: '사용 가능한 서비스' })
		const focusOnDisconnectedService = vi.fn()
		opener.addEventListener('focus', focusOnDisconnectedService, { once: true })
		try {
			if (isAlreadyDisconnected) isConnected = false
			await user.click(confirm)
			await waitFor(() => expect(dialog).not.toBeInTheDocument())
			await waitFor(() => expect(available).toHaveFocus())
			expect(connectedCard).toBeInTheDocument()
		} finally {
			releaseList()
		}

		await waitFor(() => expect(connectedCard).not.toBeInTheDocument())
		expect(focusOnDisconnectedService).not.toHaveBeenCalled()
		expect(listConnections).toHaveBeenCalledWith(true)
		expect(listConnections).toHaveBeenLastCalledWith(false)
		expect(deleteConnection).toHaveBeenCalledExactlyOnceWith(provider, '')
		expect(screen.queryByText(alreadyDisconnectedMessage)).not.toBeInTheDocument()
		expect(available).toHaveFocus()
		expect(within(await findCard('Google')).queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		const availableTile = await findCard(label)
		await user.click(within(availableTile).getByRole('button', { name: '연결하기' }))

		await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith(authorizeUrl))
		expect(requestAuthorize).toHaveBeenCalledOnce()
	})
})
