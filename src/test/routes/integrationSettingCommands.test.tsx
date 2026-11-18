import type { ComponentProps, ReactNode } from 'react'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResourceEmptyHandler } from '@/mocks/apiScenarios'
import { emptyOAuthConnectionsResponse, oauthConnectionsResponse, slackOAuthConnection } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'

const WEBHOOK_SERVICE_ID = '55555555-5555-4555-8555-555555555555'
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize?client_id=ieum-test'
const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize?client_id=ieum-test&state=s'
const SLACK_BOT_SERVICE_ID = `oauth-${slackOAuthConnection.id}`
const GOOGLE_SERVICE_ID = `oauth-${oauthConnectionsResponse.data[0].id}`

// 상세 view 전환(mode='wait')과 Modal exit 애니메이션이 jsdom에서 끝나지 않으므로 즉시 렌더한다.
vi.mock('framer-motion', async () => {
	const React = await import('react')
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	type MotionDivProps = ComponentProps<'div'> & {
		onAnimationComplete?: (definition: string) => void
		custom?: unknown
		variants?: unknown
		initial?: unknown
		animate?: unknown
		exit?: unknown
		transition?: unknown
	}
	const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
		({ children, onAnimationComplete, custom, variants, initial, animate, exit, transition, ...domProps }, ref) => {
			void custom
			void variants
			void initial
			void animate
			void exit
			void transition
			React.useEffect(() => {
				onAnimationComplete?.('animate')
			}, [onAnimationComplete])
			return (
				<div ref={ref} {...domProps}>
					{children}
				</div>
			)
		}
	)
	return {
		...actual,
		AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
		motion: new Proxy(actual.motion, {
			get: (target, property) => (property === 'div' ? MotionDiv : Reflect.get(target, property)),
		}),
	}
})

const createDeferred = () => {
	let resolve!: () => void
	const promise = new Promise<void>(next => {
		resolve = next
	})
	return { promise, resolve }
}

const observeWebhookDelete = () => {
	const deletedIds: string[] = []
	const response = createDeferred()
	server.use(
		http.delete('*/api/v1/webhook-credentials/:id', async ({ params }) => {
			deletedIds.push(String(params.id))
			await response.promise
			return HttpResponse.json({ success: true, data: {}, message: 'success', code: 'SUCCESS' })
		})
	)
	return { deletedIds, release: response.resolve }
}

const getAvailableTile = async (name: string) => {
	const heading = await screen.findByRole('heading', { level: 3, name })
	const tile = heading.closest('article')
	expect(tile).not.toBeNull()
	return tile as HTMLElement
}

const openGoogleCardDisconnect = async (user: ReturnType<typeof userEvent.setup>) => {
	const heading = await screen.findByRole('heading', { level: 3, name: 'Google' })
	const card = heading.closest('article') as HTMLElement
	await user.click(within(card).getByRole('button', { name: '연동 해제' }))
	const dialog = await screen.findByRole('alertdialog', { name: 'Google 연동 해제' })
	return { card, dialog }
}

const openDisconnectConfirm = async () => {
	const rendered = renderAppRoute(`/inter-setting?serviceId=${WEBHOOK_SERVICE_ID}`)
	await screen.findByRole('heading', { level: 2, name: '팀 Slack' })
	fireEvent.click(screen.getByRole('button', { name: '연결 해제' }))
	const dialog = await screen.findByRole('alertdialog', { name: '연결 해제' })
	return { ...rendered, dialog }
}

const mockSlackBotConnected = () =>
	server.use(
		http.get('*/api/v1/oauth/connections', () =>
			HttpResponse.json({ ...oauthConnectionsResponse, data: [...oauthConnectionsResponse.data, slackOAuthConnection] })
		)
	)

beforeEach(() => {
	server.use(
		http.get('*/api/v1/integrations/:serviceType/workflows', () =>
			HttpResponse.json({
				success: true,
				data: { content: [], size: 20, hasNext: false, nextCursor: null },
				message: 'success',
				code: 'SUCCESS',
			})
		)
	)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

describe('통합 설정 연결', () => {
	it('OAuth 서비스 연결은 authorize URL로 이동한다', async () => {
		const assign = vi.fn()
		vi.stubGlobal('location', { ...window.location, assign })
		// OAuth 이동 주소는 VITE_API_URL을 기준으로 만든다. .env가 없는 CI에서도 같은 조건으로 실행한다.
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		server.use(
			http.get('*/api/v1/github/oauth2/authorize', () =>
				HttpResponse.json({
					success: true,
					data: { authorizationUrl: GITHUB_AUTHORIZE_URL },
					message: 'success',
					code: 'SUCCESS',
				})
			)
		)
		renderAppRoute('/inter-setting')

		const tile = await getAvailableTile('GitHub')
		fireEvent.click(within(tile).getByRole('button', { name: '연결하기' }))

		await waitFor(() => expect(assign).toHaveBeenCalledWith(GITHUB_AUTHORIZE_URL))
		expect(assign).toHaveBeenCalledTimes(1)
	})

	it('webhook 서비스 연결은 연결 modal을 연다', async () => {
		renderAppRoute('/inter-setting')

		const tile = await getAvailableTile('Discord')
		fireEvent.click(within(tile).getByRole('button', { name: '연결하기' }))

		expect(await screen.findByRole('dialog', { name: 'Discord 웹훅 연결' })).toBeInTheDocument()
	})
})

describe('통합 설정 연결 해제', () => {
	it('위험 동작 확인 modal을 서비스 이름과 함께 연다', async () => {
		const { dialog } = await openDisconnectConfirm()

		expect(
			within(dialog).getByText('팀 Slack 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.')
		).toBeInTheDocument()
		expect(useModalStore.getState().variant).toBe('danger')
		await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus())
	})

	it('확인하면 삭제 요청 후 목록 view로 돌아간다', async () => {
		const deleteRequest = observeWebhookDelete()
		deleteRequest.release()
		const { dialog, router } = await openDisconnectConfirm()

		fireEvent.click(within(dialog).getByRole('button', { name: '연결 해제' }))

		await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(deleteRequest.deletedIds).toEqual([WEBHOOK_SERVICE_ID])
		// router 상태는 startTransition render보다 먼저 바뀌므로 목록 view는 DOM 기준으로 기다린다.
		await waitFor(() => expect(document.querySelector('[data-integration-view="list"]')).not.toBeNull())
	})

	it('취소하면 삭제 요청 없이 상세에 머문다', async () => {
		const deleteRequest = observeWebhookDelete()
		const { dialog, router } = await openDisconnectConfirm()

		fireEvent.click(within(dialog).getByRole('button', { name: '취소' }))

		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
		expect(deleteRequest.deletedIds).toEqual([])
		expect(new URLSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)
	})

	it('삭제 요청이 진행 중이면 다시 해제할 수 없다', async () => {
		const deleteRequest = observeWebhookDelete()
		const { dialog, router } = await openDisconnectConfirm()

		fireEvent.click(within(dialog).getByRole('button', { name: '연결 해제' }))

		const pendingButton = await screen.findByRole('button', { name: '해제 중…' })
		expect(pendingButton).toBeDisabled()
		fireEvent.click(pendingButton)
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		await waitFor(() => expect(deleteRequest.deletedIds).toEqual([WEBHOOK_SERVICE_ID]))

		deleteRequest.release()
		await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(deleteRequest.deletedIds).toEqual([WEBHOOK_SERVICE_ID])
	})
})

describe('통합 설정 Slack 봇 연결', () => {
	it('Slack 봇 타일의 연결하기는 Slack authorize URL로 이동한다', async () => {
		const assign = vi.fn()
		vi.stubGlobal('location', { ...window.location, assign })
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		server.use(
			http.get('*/api/v1/slack/oauth2/authorize', () =>
				HttpResponse.json({ success: true, data: { authUrl: SLACK_AUTHORIZE_URL }, message: 'OK', code: 'OK' })
			)
		)
		renderAppRoute('/inter-setting')

		const tile = await getAvailableTile('Slack 봇')
		fireEvent.click(within(tile).getByRole('button', { name: '연결하기' }))

		await waitFor(() => expect(assign).toHaveBeenCalledWith(SLACK_AUTHORIZE_URL))
	})

	it('Slack 웹훅 타일의 연결하기는 웹훅 연결 modal을 연다', async () => {
		server.use(createResourceEmptyHandler('webhookCredentials'))
		renderAppRoute('/inter-setting')

		const tile = await getAvailableTile('Slack 웹훅')
		fireEvent.click(within(tile).getByRole('button', { name: '연결하기' }))

		expect(await screen.findByRole('dialog', { name: 'Slack 웹훅 연결' })).toBeInTheDocument()
	})

	it('연결된 카드에 봇과 웹훅 연결 방식을 배지로 구분한다', async () => {
		mockSlackBotConnected()
		renderAppRoute('/inter-setting')

		const botHeading = await screen.findByRole('heading', { level: 3, name: 'Slack' })
		const botCard = botHeading.closest('article') as HTMLElement
		expect(within(botCard).getByText('봇')).toBeInTheDocument()
		expect(within(botCard).getByText('이음 팀')).toBeInTheDocument()
		// 웹훅·OAuth 연결 목록은 따로 도착하므로 웹훅 카드도 따로 기다린다.
		const webhookHeading = await screen.findByRole('heading', { level: 3, name: '팀 Slack' })
		const webhookCard = webhookHeading.closest('article') as HTMLElement
		expect(within(webhookCard).getByText('웹훅')).toBeInTheDocument()
	})

	it('connected=slack으로 돌아오면 연결 완료를 안내하고 query를 지운다', async () => {
		const { router } = renderAppRoute('/inter-setting?connected=slack')

		expect(await screen.findByText('Slack 워크스페이스가 연결되었습니다.')).toBeInTheDocument()
		await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('connected')).toBe(false))
	})

	it('Slack 봇 해제는 재초대 안내를 확인한 뒤 Slack 해제 API를 호출하고 목록으로 돌아간다', async () => {
		mockSlackBotConnected()
		const deleteRequest = vi.fn()
		server.use(
			http.delete('*/api/v1/slack/oauth2/connection', () => {
				deleteRequest()
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { router } = renderAppRoute(`/inter-setting?serviceId=${SLACK_BOT_SERVICE_ID}`)

		await screen.findByRole('heading', { level: 2, name: 'Slack' })
		fireEvent.click(screen.getByRole('button', { name: '연결 해제' }))
		const dialog = await screen.findByRole('alertdialog', { name: '연결 해제' })
		expect(within(dialog).getByText(/다시 연결하면 비공개 채널에는 봇을 다시 초대해야 해요/)).toBeInTheDocument()

		fireEvent.click(within(dialog).getByRole('button', { name: '연결 해제' }))

		await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(deleteRequest).toHaveBeenCalledOnce()
	})
})

describe('통합 설정 Google·Notion·GitHub 해제', () => {
	it('Google 상세에서 해제 확인을 열고 취소하면 상세에 머문다', async () => {
		const user = userEvent.setup()
		renderAppRoute(`/inter-setting?serviceId=${GOOGLE_SERVICE_ID}`)

		const disconnectButton = await screen.findByRole('button', { name: '연동 해제' })
		expect(screen.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		await user.click(disconnectButton)
		const dialog = await screen.findByRole('alertdialog', { name: 'Google 연동 해제' })
		await within(dialog).findByRole('button', { name: '연동 해제' })
		await user.click(within(dialog).getByRole('button', { name: '취소' }))

		expect(screen.queryByRole('alertdialog', { name: 'Google 연동 해제' })).not.toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 2, name: 'Google' })).toBeInTheDocument()
	})

	it('목록의 Google 해제는 모든 영향 페이지를 확인하고 승인한 뒤 연결 가능 타일을 복원한다', async () => {
		const user = userEvent.setup()
		const getWorkflows = vi.fn()
		const deleteConnection = vi.fn()
		const lastPage = createDeferred()
		let isConnected = true
		server.use(
			http.get('*/api/v1/oauth/connections', () =>
				HttpResponse.json(isConnected ? oauthConnectionsResponse : emptyOAuthConnectionsResponse)
			),
			http.get('*/api/v1/integrations/:serviceType/workflows', async ({ params, request }) => {
				const search = new URL(request.url).searchParams
				const cursor = search.get('cursor')
				getWorkflows(params.serviceType, search.get('size'), cursor)
				const isFirst = cursor === null
				if (!isFirst) await lastPage.promise
				return HttpResponse.json({
					success: true,
					data: {
						content: [
							{
								id: isFirst ? 'manual' : 'schedule',
								name: isFirst ? '수동 요청' : '일정 자동 등록',
								description: '',
								active: true,
								triggerType: isFirst ? 'MANUAL' : 'SCHEDULE',
								usedNodeCount: 1,
								updatedAt: '2026-11-01T00:00:00Z',
							},
						],
						size: 100,
						hasNext: isFirst,
						nextCursor: isFirst ? 'cursor-2' : null,
					},
					message: 'success',
					code: 'SUCCESS',
				})
			}),
			http.delete('*/api/v1/oauth/connections/:provider', ({ params }) => {
				deleteConnection(params.provider)
				isConnected = false
				return HttpResponse.json({ success: true, data: null, message: 'success', code: 'SUCCESS' })
			})
		)
		renderAppRoute('/inter-setting')

		const { card, dialog: dialogElement } = await openGoogleCardDisconnect(user)
		const dialog = within(dialogElement)
		try {
			await waitFor(() => expect(getWorkflows).toHaveBeenCalledTimes(2))
			expect(getWorkflows.mock.calls).toEqual([
				['google', '100', null],
				['google', '100', 'cursor-2'],
			])
			expect(dialog.queryByRole('button', { name: '연동 해제' })).not.toBeInTheDocument()
		} finally {
			lastPage.resolve()
		}

		const confirm = await dialog.findByRole('button', { name: '연동 해제' })
		expect(dialog.getByText('수동 요청')).toBeInTheDocument()
		expect(dialog.getByText('일정 자동 등록')).toBeInTheDocument()
		expect(dialog.getByText('자동 실행 실패')).toBeInTheDocument()
		expect(deleteConnection).not.toHaveBeenCalled()
		await user.click(confirm)

		await waitFor(() => expect(card).not.toBeInTheDocument())
		const availableTile = await getAvailableTile('Google Drive')
		expect(within(availableTile).getByRole('button', { name: '연결하기' })).toBeInTheDocument()
		expect(deleteConnection).toHaveBeenCalledExactlyOnceWith('GOOGLE')
	})

	it('다른 탭에서 이미 Google을 해제했으면 오류 없이 목록을 갱신하고 이음 로그인을 유지한다', async () => {
		const user = userEvent.setup()
		const observeConnections = vi.fn()
		const auth = { accessToken: 'test-existing-access', refreshToken: 'test-existing-refresh' }
		const errorMessage = '연동된 계정이 없습니다.'
		let isConnected = true
		server.use(
			http.get('*/api/v1/oauth/connections', () => {
				observeConnections(isConnected)
				return HttpResponse.json(isConnected ? oauthConnectionsResponse : emptyOAuthConnectionsResponse)
			}),
			http.delete('*/api/v1/oauth/connections/GOOGLE', () =>
				HttpResponse.json(
					{ success: false, data: null, message: errorMessage, code: 'ACCOUNT_NOT_CONNECTED' },
					{ status: 400 }
				)
			)
		)
		const { router } = renderAppRoute('/inter-setting', { auth })

		const { card, dialog } = await openGoogleCardDisconnect(user)
		const confirm = await within(dialog).findByRole('button', { name: '연동 해제' })
		isConnected = false
		await user.click(confirm)

		await waitFor(() => expect(card).not.toBeInTheDocument())
		expect(observeConnections).toHaveBeenCalledWith(true)
		expect(observeConnections).toHaveBeenLastCalledWith(false)
		expect(dialog).not.toBeInTheDocument()
		expect(screen.queryByText(errorMessage)).not.toBeInTheDocument()
		expect(within(await getAvailableTile('Google Drive')).getByRole('button', { name: '연결하기' })).toBeInTheDocument()
		expect(router.state.location.pathname).toBe('/inter-setting')
		expect(useAuthStore.getState()).toMatchObject(auth)
	})

	it('다른 해제 오류는 확인창 안에서 안내하고 연결된 카드를 유지한다', async () => {
		const user = userEvent.setup()
		const errorMessage = '이 연동을 해제할 수 없습니다.'
		server.use(
			http.delete('*/api/v1/oauth/connections/GOOGLE', () =>
				HttpResponse.json({ success: false, data: null, message: errorMessage, code: 'INVALID_INPUT' }, { status: 400 })
			)
		)
		renderAppRoute('/inter-setting')

		const { card, dialog } = await openGoogleCardDisconnect(user)
		const confirm = await within(dialog).findByRole('button', { name: '연동 해제' })
		await user.click(confirm)

		expect(await within(dialog).findByRole('alert')).toHaveTextContent(errorMessage)
		expect(within(dialog).getByRole('button', { name: '연동 해제' })).toBeEnabled()
		expect(card).toBeInTheDocument()
	})
})
