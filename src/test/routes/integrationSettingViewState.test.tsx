import type { ComponentProps, ReactNode } from 'react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { MotionProps } from 'framer-motion'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { createDelayedSuccessHandlers, createObservedSuccessHandlers, createPartialFailureHandlers } from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { setReducedMotion } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

const WEBHOOK_SERVICE_ID = '55555555-5555-4555-8555-555555555555'
const OAUTH_SERVICE_ID = 'oauth-66666666-6666-4666-8666-666666666666'
type MotionAnimationComplete = NonNullable<MotionProps['onAnimationComplete']>
const motionTestState = vi.hoisted(() => ({
	autoComplete: true,
	callbacks: [] as MotionAnimationComplete[],
}))

vi.mock('framer-motion', async () => {
	const React = await import('react')
	const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
	type MotionDivProps = Omit<ComponentProps<'div'>, 'onAnimationComplete'> & {
		onAnimationComplete?: MotionAnimationComplete
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
				if (!onAnimationComplete) return
				motionTestState.callbacks.push(onAnimationComplete)
				if (motionTestState.autoComplete) onAnimationComplete('animate')
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

const getSearchParams = (search: string) => new URLSearchParams(search)

beforeEach(() => {
	motionTestState.autoComplete = true
	motionTestState.callbacks.length = 0
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

afterEach(() => vi.restoreAllMocks())

describe('통합 설정 URL 보기 상태', () => {
	it('상세 진입을 history에 추가하고 다른 query와 back/forward를 보존한다', async () => {
		const { router } = renderAppRoute('/inter-setting?source=test')
		const serviceName = await screen.findByText('팀 Slack')
		const card = serviceName.closest('article')
		expect(card).not.toBeNull()

		fireEvent.click(within(card as HTMLElement).getByRole('button', { name: '관리' }))

		await waitFor(() => expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID))
		expect(getSearchParams(router.state.location.search).get('source')).toBe('test')
		expect(screen.getByRole('heading', { level: 2, name: '팀 Slack' })).toBeInTheDocument()

		await act(async () => router.navigate(-1))
		expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false)
		expect(await screen.findByText('팀 Slack')).toBeInTheDocument()

		await act(async () => router.navigate(1))
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)
		expect(await screen.findByRole('heading', { level: 2, name: '팀 Slack' })).toBeInTheDocument()
		expect(await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')).toBeInTheDocument()
	})

	it('명시적 목록 복귀는 현재 상세 entry를 교체한다', async () => {
		const { router } = renderAppRoute(`/inter-setting?source=test&serviceId=${WEBHOOK_SERVICE_ID}`)
		const goList = await screen.findByRole('button', { name: '연결된 서비스 목록' })
		await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')
		fireEvent.click(goList)

		await waitFor(() => expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(getSearchParams(router.state.location.search).get('source')).toBe('test')

		await act(async () => router.navigate(-1))
		expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false)
		expect(await screen.findByText('팀 Slack')).toBeInTheDocument()
	})

	it('없는 serviceId는 loading 중 보존하고 두 source 성공 후 정규화한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))
		const { router } = renderAppRoute('/inter-setting?source=test&serviceId=missing')

		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe('missing')
		expect(screen.getByRole('status', { name: '서비스 상세 정보 불러오는 중' })).toHaveAttribute('aria-busy', 'true')

		await screen.findByText('팀 Slack')
		await waitFor(() => expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		expect(getSearchParams(router.state.location.search).get('source')).toBe('test')
		expect(document.body).toHaveFocus()
		expect(screen.getByRole('button', { name: '서비스 관리' })).not.toHaveFocus()
	})

	it('source error 중에는 없는 serviceId를 보존한다', async () => {
		server.use(...createPartialFailureHandlers(['oauthConnections']))
		const { router } = renderAppRoute('/inter-setting?serviceId=missing')

		expect(await screen.findByText('서비스 정보를 확인하지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'OAuth 연결 다시 시도' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '웹훅 연결 다시 시도' })).not.toBeInTheDocument()
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe('missing')
	})

	it('한 source에서 대상을 찾으면 다른 source error와 무관하게 상세를 표시한다', async () => {
		server.use(...createPartialFailureHandlers(['oauthConnections']))
		const { router } = renderAppRoute(`/inter-setting?serviceId=${WEBHOOK_SERVICE_ID}`)

		expect(await screen.findByRole('heading', { level: 2, name: '팀 Slack' })).toBeInTheDocument()
		expect(await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')).toBeInTheDocument()
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)
	})

	it('실패한 detail source만 다시 요청해 요청한 상세를 복구한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['oauthConnections']))
		const { router } = renderAppRoute(`/inter-setting?serviceId=${OAUTH_SERVICE_ID}`)
		const retry = await screen.findByRole('button', { name: 'OAuth 연결 다시 시도' })

		server.use(...createObservedSuccessHandlers(observeRequest))
		fireEvent.click(retry)

		expect(await screen.findByRole('heading', { level: 2, name: 'Google' })).toHaveFocus()
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(OAUTH_SERVICE_ID)
		expect(observeRequest.mock.calls.filter(([resource]) => resource === 'oauthConnections')).toHaveLength(1)
		expect(observeRequest).toHaveBeenCalledTimes(1)
	})

	it('OAuth 복귀 query만 제거하고 상세 상태와 다른 query를 보존한다', async () => {
		const { router } = renderAppRoute(
			`/inter-setting?serviceId=${WEBHOOK_SERVICE_ID}&source=test&success=true&provider=github`
		)

		await waitFor(() => expect(getSearchParams(router.state.location.search).has('success')).toBe(false))
		expect(getSearchParams(router.state.location.search).get('provider')).toBeNull()
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)
		expect(getSearchParams(router.state.location.search).get('source')).toBe('test')
		expect(await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')).toBeInTheDocument()
	})

	it('OAuth query는 invalidation 완료 전에 정리하고 이후 URL 변경을 되돌리지 않는다', async () => {
		const queryClient = createTestQueryClient()
		let resolveInvalidation: () => void = () => undefined
		const deferredInvalidation = new Promise<void>(resolve => {
			resolveInvalidation = resolve
		})
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(deferredInvalidation)
		const { router } = renderAppRoute('/inter-setting?source=oauth&success=true&provider=github', { queryClient })

		await waitFor(() => expect(invalidateQueries).toHaveBeenCalledOnce())
		await waitFor(() => expect(getSearchParams(router.state.location.search).has('success')).toBe(false))
		expect(getSearchParams(router.state.location.search).toString()).toBe('source=oauth')

		await act(async () => {
			await router.navigate(`/inter-setting?source=later&serviceId=${WEBHOOK_SERVICE_ID}`)
		})
		expect(getSearchParams(router.state.location.search).get('source')).toBe('later')
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)

		await act(async () => {
			resolveInvalidation()
			await deferredInvalidation
		})
		expect(getSearchParams(router.state.location.search).get('source')).toBe('later')
		expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(WEBHOOK_SERVICE_ID)
		expect(await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')).toBeInTheDocument()
	})

	it('상세의 section 선택은 serviceId를 제거하고 reduced-motion에서 즉시 스크롤한다', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		setReducedMotion(true)
		const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
		const { router } = renderAppRoute(`/inter-setting?source=test&serviceId=${WEBHOOK_SERVICE_ID}`)
		await screen.findByText('이 서비스를 사용하는 워크플로우가 없습니다.')

		const aiCredentials = screen.getByRole('button', { name: 'AI 자격증명' })
		fireEvent.click(aiCredentials)

		await waitFor(() => expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		await act(async () => {
			await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
		})
		expect(getSearchParams(router.state.location.search).get('source')).toBe('test')
		expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' })
		await waitFor(() => expect(aiCredentials).toHaveFocus())
		expect(screen.queryByRole('tab')).not.toBeInTheDocument()
	})

	it('상세 진입 후 제목으로 이동하고 목록 복귀 후 원래 관리 버튼으로 복원한다', async () => {
		const { router } = renderAppRoute('/inter-setting')
		const serviceName = await screen.findByText('팀 Slack')
		const card = serviceName.closest('article')
		const manage = within(card as HTMLElement).getByRole('button', { name: '관리' })

		fireEvent.click(manage)
		const detailHeading = await screen.findByRole('heading', { level: 2, name: '팀 Slack' })
		await waitFor(() => expect(detailHeading).toHaveFocus())

		fireEvent.click(screen.getByRole('button', { name: '연결된 서비스 목록' }))
		const returnedServiceName = await screen.findByText('팀 Slack')
		const returnedCard = returnedServiceName.closest('article')
		const returnedManage = within(returnedCard as HTMLElement).getByRole('button', { name: '관리' })
		await waitFor(() => expect(returnedManage).toHaveFocus())

		fireEvent.click(returnedManage)
		await screen.findByRole('heading', { level: 2, name: '팀 Slack' })
		await act(async () => router.navigate(-1))
		const historyReturnedServiceName = await screen.findByText('팀 Slack')
		const historyReturnedCard = historyReturnedServiceName.closest('article')
		const historyReturnedManage = within(historyReturnedCard as HTMLElement).getByRole('button', { name: '관리' })
		await waitFor(() => expect(historyReturnedManage).toHaveFocus())
	})

	it('직접 상세 URL은 초기 전환 없이 데이터가 준비되면 제목에 초점을 둔다', async () => {
		renderAppRoute(`/inter-setting?serviceId=${WEBHOOK_SERVICE_ID}`)

		const detailHeading = await screen.findByRole('heading', { level: 2, name: '팀 Slack' })
		await waitFor(() => expect(detailHeading).toHaveFocus())
		expect(detailHeading).toHaveAttribute('tabindex', '-1')
	})

	it('나가는 화면의 exit 완료는 상세 제목 focus를 실행하지 않는다', async () => {
		motionTestState.autoComplete = false
		renderAppRoute('/inter-setting')
		const serviceName = await screen.findByText('팀 Slack')
		const card = serviceName.closest('article')

		fireEvent.click(within(card as HTMLElement).getByRole('button', { name: '관리' }))
		const detailHeading = await screen.findByRole('heading', { level: 2, name: '팀 Slack' })
		const detailAnimationComplete = motionTestState.callbacks.at(-1)
		expect(detailAnimationComplete).toBeDefined()

		act(() => detailAnimationComplete?.('exit'))
		expect(detailHeading).not.toHaveFocus()

		act(() => detailAnimationComplete?.('animate'))
		expect(detailHeading).toHaveFocus()
	})

	it('빠른 상세 ID 변경 뒤 마지막 상세와 하나의 전환 child만 유지한다', async () => {
		const { router } = renderAppRoute('/inter-setting')
		await screen.findByText('팀 Slack')

		await act(async () => {
			void router.navigate(`/inter-setting?serviceId=${WEBHOOK_SERVICE_ID}`)
			void router.navigate(`/inter-setting?serviceId=${OAUTH_SERVICE_ID}`)
		})

		await waitFor(() => expect(getSearchParams(router.state.location.search).get('serviceId')).toBe(OAUTH_SERVICE_ID))
		expect(await screen.findByRole('heading', { level: 2, name: 'Google' })).toBeInTheDocument()
		expect(screen.queryByRole('heading', { level: 2, name: '팀 Slack' })).not.toBeInTheDocument()
		expect(document.querySelectorAll('[data-integration-view]')).toHaveLength(1)
		expect(document.querySelector('[data-integration-view]')).toHaveAttribute(
			'data-integration-view',
			`detail:${OAUTH_SERVICE_ID}`
		)
	})

	it('상세 서비스가 사라지면 목록 전환 후 서비스 section 버튼으로 초점을 보낸다', async () => {
		const { queryClient, router } = renderAppRoute('/inter-setting')
		const serviceName = await screen.findByText('팀 Slack')
		const card = serviceName.closest('article')

		fireEvent.click(within(card as HTMLElement).getByRole('button', { name: '관리' }))
		await screen.findByRole('heading', { level: 2, name: '팀 Slack' })

		act(() => queryClient.setQueryData(queryKeys.webhookCredentials.list(), []))

		await waitFor(() => expect(getSearchParams(router.state.location.search).has('serviceId')).toBe(false))
		await waitFor(() => expect(screen.getByRole('button', { name: '서비스 관리' })).toHaveFocus())
	})
})
