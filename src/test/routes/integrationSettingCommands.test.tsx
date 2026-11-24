import type { ComponentProps, ReactNode } from 'react'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createResourceEmptyHandler } from '@/mocks/apiScenarios'
import { oauthConnectionsResponse, slackOAuthConnection } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import { useModalStore } from '@/stores/useModalStore'

const WEBHOOK_SERVICE_ID = '55555555-5555-4555-8555-555555555555'
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize?client_id=ieum-test'
const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize?client_id=ieum-test&state=s'
const SLACK_BOT_SERVICE_ID = `oauth-${slackOAuthConnection.id}`
const GOOGLE_SERVICE_ID = `oauth-${oauthConnectionsResponse.data[0].id}`
const GOOGLE_AUTHORIZATION_PATH = '/api/v1/oauth2/authorize/google?scope_groups=calendar&link_token=test-link-token'

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

	it('해제·재연결 경로가 없는 OAuth 연결 상세에는 연결 해제·다시 연결 버튼을 표시하지 않는다', async () => {
		const connection = { ...oauthConnectionsResponse.data[0], provider: 'UNKNOWN', providerAccountId: 'unknown-account' }
		server.use(
			http.get('*/api/v1/oauth/connections', () => HttpResponse.json({ ...oauthConnectionsResponse, data: [connection] }))
		)
		renderAppRoute(`/inter-setting?serviceId=oauth-${connection.id}`)

		await screen.findByText(connection.providerAccountId)
		expect(screen.getByRole('button', { name: '연결된 서비스 목록' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '연결 해제' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '다시 연결' })).not.toBeInTheDocument()
	})
})

describe('통합 설정 Google 연결', () => {
	const observeGoogleConnect = () => {
		const bodies: unknown[] = []
		server.use(
			http.post('*/api/v1/oauth/google/connect', async ({ request }) => {
				bodies.push(await request.json())
				return HttpResponse.json({
					success: true,
					message: 'OK',
					code: 'OK',
					data: { authorizationUrl: GOOGLE_AUTHORIZATION_PATH },
				})
			})
		)
		return bodies
	}

	const stubRedirect = () => {
		const assign = vi.fn()
		vi.stubGlobal('location', { ...window.location, assign })
		// authorizationUrl은 API 서버 기준 경로라 VITE_API_URL 호스트를 붙여 이동한다.
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		return assign
	}

	it('Google Calendar 타일의 연결하기는 calendar 권한으로 연결을 시작하고 API 호스트의 인가 주소로 이동한다', async () => {
		const assign = stubRedirect()
		const bodies = observeGoogleConnect()
		server.use(createResourceEmptyHandler('oauthConnections'))
		renderAppRoute('/inter-setting')

		const tile = await getAvailableTile('Google Calendar')
		expect(within(tile).getByRole('img', { name: 'Google Calendar 로고' })).toBeInTheDocument()
		fireEvent.click(within(tile).getByRole('button', { name: '연결하기' }))

		await waitFor(() => expect(assign).toHaveBeenCalledWith(`https://api.example.com${GOOGLE_AUTHORIZATION_PATH}`))
		expect(bodies).toEqual([{ scopeGroups: ['calendar'] }])
	})

	it('Google이 연결돼 있으면 Google Calendar 타일을 연결 가능 목록에 보여 주지 않는다', async () => {
		renderAppRoute('/inter-setting')

		await screen.findByRole('heading', { level: 3, name: 'Google' })
		await screen.findByRole('heading', { level: 3, name: 'GitHub' })
		expect(screen.queryByRole('heading', { level: 3, name: 'Google Calendar' })).not.toBeInTheDocument()
	})

	it('Google 상세의 다시 연결은 calendar 권한으로 연결을 다시 시작한다', async () => {
		const assign = stubRedirect()
		const bodies = observeGoogleConnect()
		renderAppRoute(`/inter-setting?serviceId=${GOOGLE_SERVICE_ID}`)

		await screen.findByRole('heading', { level: 2, name: 'Google' })
		fireEvent.click(screen.getByRole('button', { name: '다시 연결' }))

		await waitFor(() => expect(assign).toHaveBeenCalledWith(`https://api.example.com${GOOGLE_AUTHORIZATION_PATH}`))
		expect(bodies).toEqual([{ scopeGroups: ['calendar'] }])
		// 이동하는 동안 다시 누를 수 없다.
		expect(screen.getByRole('button', { name: '이동 중…' })).toBeDisabled()
	})

	it('다시 연결 요청이 거절되면 서버 메시지로 연결 실패를 안내한다', async () => {
		stubRedirect()
		server.use(
			http.post('*/api/v1/oauth/google/connect', () =>
				HttpResponse.json(
					{ success: false, data: null, message: '지원하지 않는 권한 묶음입니다.', code: 'INVALID_INPUT' },
					{ status: 400 }
				)
			)
		)
		renderAppRoute(`/inter-setting?serviceId=${GOOGLE_SERVICE_ID}`)

		await screen.findByRole('heading', { level: 2, name: 'Google' })
		fireEvent.click(screen.getByRole('button', { name: '다시 연결' }))

		const dialog = await screen.findByRole('dialog', { name: '연결 실패' })
		expect(within(dialog).getByText('지원하지 않는 권한 묶음입니다.')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '다시 연결' })).toBeEnabled()
	})

	it('Google 해제는 영향받는 워크플로우를 확인 창에 보여 준 뒤 공용 해제 API를 호출하고 목록으로 돌아간다', async () => {
		const deleteRequest = vi.fn()
		// 조회 중 버튼 상태를 확인할 수 있도록 워크플로우 응답을 붙잡아 둔다. 상세 아래 목록 조회도 같은 응답을 기다린다.
		const workflowsResponse = createDeferred()
		server.use(
			http.get('*/api/v1/integrations/google/workflows', async () => {
				await workflowsResponse.promise
				return HttpResponse.json({
					success: true,
					data: {
						content: ['일정 알림', '주간 회의 정리', '휴가 등록', '마감 리마인드'].map((name, index) => ({
							id: `workflow-${index}`,
							name,
							description: '',
							active: true,
							triggerType: 'MANUAL',
							usedNodeCount: 1,
							updatedAt: '2026-11-15T00:00:00Z',
						})),
						size: 20,
						hasNext: false,
						nextCursor: null,
					},
					message: 'success',
					code: 'SUCCESS',
				})
			}),
			http.delete('*/api/v1/oauth/connections/GOOGLE', () => {
				deleteRequest()
				return HttpResponse.json({ success: true, message: 'OK', code: 'OK' })
			})
		)
		const { router } = renderAppRoute(`/inter-setting?serviceId=${GOOGLE_SERVICE_ID}`)

		await screen.findByRole('heading', { level: 2, name: 'Google' })
		fireEvent.click(screen.getByRole('button', { name: '연결 해제' }))
		expect(await screen.findByRole('button', { name: '확인 중…' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '다시 연결' })).toBeDisabled()
		expect(screen.queryByRole('alertdialog', { name: '연결 해제' })).not.toBeInTheDocument()

		workflowsResponse.resolve()
		const dialog = await screen.findByRole('alertdialog', { name: '연결 해제' })
		expect(
			within(dialog).getByText(/워크플로우 4개는 실행할 때 실패해요: 일정 알림, 주간 회의 정리, 휴가 등록 외 1개\./)
		).toBeInTheDocument()

		fireEvent.click(within(dialog).getByRole('button', { name: '연결 해제' }))

		await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(deleteRequest).toHaveBeenCalledOnce()
	})

	it('Google 콜백의 linked=google로 돌아오면 연동 화면에서 연결 완료를 안내한다', async () => {
		const { router } = renderAppRoute('/oauth2/callback?linked=google')

		expect(await screen.findByText('Google 계정이 연결되었습니다.')).toBeInTheDocument()
		await waitFor(() => expect(router.state.location.pathname).toBe('/inter-setting'))
		expect(new URLSearchParams(router.state.location.search).has('success')).toBe(false)
	})
})
