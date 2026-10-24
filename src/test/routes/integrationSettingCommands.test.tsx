import type { ComponentProps, ReactNode } from 'react'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { renderAppRoute } from '@/test/renderAppRoute'
import { useModalStore } from '@/stores/useModalStore'

const WEBHOOK_SERVICE_ID = '55555555-5555-4555-8555-555555555555'
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize?client_id=ieum-test'

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
