import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createResourceHoldHandler } from '@/mocks/apiScenarios'
import { googleIntegrationWorkflowsResponse, oauthConnectionsResponse } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import type { OAuthConnectionDto } from '@/types/oauthConnections'

const RECONNECT_CASES = [
	{
		label: 'GitHub',
		provider: 'GITHUB',
		serviceType: 'github',
		entry: 'list',
		isAlreadyDisconnected: false,
		notice: /GitHub 앱은 설치된 상태로 남아요\. GitHub 설정의 Applications에서 제거할 수 있어요/,
		authorizeUrl: 'https://github.com/login/oauth/authorize?client_id=ieum-test',
	},
	{
		label: 'Notion',
		provider: 'NOTION',
		serviceType: 'notion',
		entry: 'detail',
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
		const { label, provider, serviceType, entry, isAlreadyDisconnected, notice, authorizeUrl } = config
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
					data: { content: [], size: Number(size), hasNext: false, nextCursor: null },
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
		const serviceId = `oauth-${connection.id}`
		const initialSearch = entry === 'detail' ? `?serviceId=${serviceId}&source=test` : '?source=test'
		const { router } = renderAppRoute(`/inter-setting${initialSearch}`)
		if (entry === 'list') {
			const connectedCard = within(await findCard(label))
			expect(connectedCard.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
			await user.click(connectedCard.getByRole('button', { name: '관리' }))
		}
		await screen.findByRole('heading', { level: 2, name: label })
		expect(new URLSearchParams(router.state.location.search).get('serviceId')).toBe(serviceId)
		const opener = screen.getByRole('button', { name: '연결 해제' })
		await user.click(opener)
		const dialog = await screen.findByRole('alertdialog', { name: `${label} 연결을 해제할까요?` })
		const confirm = await within(dialog).findByRole('button', { name: '연결 해제' })
		expect(dialog).toHaveTextContent(notice)
		expect(within(dialog).getByText(connection.providerAccountId)).toBeVisible()
		expect(within(dialog).getByText('현재 이 연결을 쓰는 워크플로우는 없어요.')).toBeVisible()
		expect(getWorkflows.mock.calls).toEqual([
			[serviceType, '20'],
			[serviceType, '100'],
		])
		expect(deleteConnection).not.toHaveBeenCalled()
		// 재조회가 늦어 목록에 이전 관리 버튼이 남더라도 키보드 포커스는 사용 가능한 서비스로 보낸다.
		let releaseList!: () => void
		const listResponse = new Promise<void>(resolve => {
			releaseList = resolve
		})
		server.use(createResourceHoldHandler('oauthConnections', listResponse))
		const focusOnDisconnectedService = vi.fn()
		const trackStaleFocus = (event: FocusEvent) => {
			const target = event.target
			if (target === opener || (target instanceof HTMLButtonElement && target.textContent === '관리')) {
				focusOnDisconnectedService()
			}
		}
		document.addEventListener('focusin', trackStaleFocus)
		try {
			if (isAlreadyDisconnected) isConnected = false
			await user.click(confirm)
			await waitFor(() => expect(dialog).not.toBeInTheDocument())
			const available = await screen.findByRole('region', { name: '사용 가능한 서비스' })
			await waitFor(() => expect(available).toHaveFocus())
			expect(router.state.location.search).toBe('?source=test')
			const cachedCard = await findCard(label)
			expect(within(cachedCard).getByRole('button', { name: '관리' })).toBeVisible()
			releaseList()
			await waitFor(() => expect(cachedCard).not.toBeInTheDocument())
			expect(available).toHaveFocus()
			expect(focusOnDisconnectedService).not.toHaveBeenCalled()
		} finally {
			releaseList()
			document.removeEventListener('focusin', trackStaleFocus)
		}

		expect(listConnections).toHaveBeenCalledWith(true)
		expect(listConnections).toHaveBeenLastCalledWith(false)
		expect(deleteConnection).toHaveBeenCalledExactlyOnceWith(provider, '')
		expect(screen.queryByText(alreadyDisconnectedMessage)).not.toBeInTheDocument()
		expect(within(await findCard('Google')).queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		const availableTile = await findCard(label)
		await user.click(within(availableTile).getByRole('button', { name: '연결하기' }))

		await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith(authorizeUrl))
		expect(requestAuthorize).toHaveBeenCalledOnce()
	})
})

describe('Notion·GitHub 연결 관리', () => {
	it.each([
		{
			label: 'GitHub',
			connection: {
				id: '88888888-8888-4888-8888-888888888888',
				provider: 'GITHUB',
				providerAccountId: 'octocat',
				displayName: null,
				scopes: ['repo'],
				createdAt: '2026-10-01T00:00:00Z',
			},
			workflowName: '새 이슈 알림',
			authorizeUrl: 'https://github.com/login/oauth/authorize?client_id=ieum-test',
		},
		{
			label: 'Notion',
			connection: {
				...oauthConnectionsResponse.data[0],
				provider: 'NOTION',
				providerAccountId: 'notion-team',
				displayName: '팀 워크스페이스',
				scopes: [],
			},
			workflowName: '주간 회의록 정리',
			authorizeUrl: 'https://api.notion.com/v1/oauth/authorize?client_id=ieum-test',
		},
	])('$label 상세에 연결 정보와 워크플로우를 표시하고 다시 연결하면 해당 서비스로 이동한다', async config => {
		const { label, connection, workflowName, authorizeUrl } = config
		const user = userEvent.setup()
		const assign = vi.fn()
		vi.stubGlobal('location', { ...window.location, assign })
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		const { data } = googleIntegrationWorkflowsResponse
		server.use(
			http.get('*/api/v1/oauth/connections', () => HttpResponse.json({ ...oauthConnectionsResponse, data: [connection] })),
			http.get(`*/api/v1/integrations/${connection.provider.toLowerCase()}/workflows`, () =>
				HttpResponse.json({
					...googleIntegrationWorkflowsResponse,
					data: { ...data, content: [{ ...data.content[0], name: workflowName }] },
				})
			),
			http.get(`*/api/v1/${connection.provider.toLowerCase()}/oauth2/authorize`, () =>
				HttpResponse.json({ success: true, data: { authorizationUrl: authorizeUrl }, message: 'OK', code: 'OK' })
			)
		)
		renderAppRoute(`/inter-setting?serviceId=oauth-${connection.id}`)

		await screen.findByRole('heading', { level: 2, name: label })
		expect(screen.getByText(connection.displayName ?? connection.providerAccountId)).toBeInTheDocument()
		if (connection.scopes.length) {
			expect(screen.getByRole('heading', { name: '권한 범위' })).toBeInTheDocument()
			expect(screen.getByText(connection.scopes[0])).toBeInTheDocument()
		} else {
			expect(screen.queryByRole('heading', { name: '권한 범위' })).not.toBeInTheDocument()
		}
		expect(await screen.findByRole('button', { name: new RegExp(workflowName) })).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: '다시 연결' }))
		await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith(authorizeUrl))
	})
})
