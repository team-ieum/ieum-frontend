import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/createAppQueryClient'
import { useIntegrationDisconnect } from '@/hooks/integration/useIntegrationDisconnect'
import { server } from '@/mocks/server'
import { useModalStore } from '@/stores/useModalStore'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { IntegrationService } from '@/types/integration'

const createWrapper =
	() =>
	({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
	)

const service = { id: 'webhook-1', name: '팀 Slack', origin: 'webhook' } as IntegrationService
const slackBotService = { id: 'oauth-1', name: 'Slack', origin: 'oauth', oauthProvider: 'SLACK' } as IntegrationService
const googleService = {
	id: 'oauth-2',
	name: 'Google',
	brand: 'google',
	origin: 'oauth',
	oauthProvider: 'GOOGLE',
} as IntegrationService
const githubService = { id: 'oauth-3', name: 'GitHub', origin: 'oauth', oauthProvider: 'GITHUB' } as IntegrationService

const workflowsResponse = (names: string[], hasNext = false) =>
	HttpResponse.json({
		success: true,
		data: {
			content: names.map((name, index) => ({
				id: `workflow-${index}`,
				name,
				description: '',
				active: true,
				triggerType: 'MANUAL',
				usedNodeCount: 1,
				updatedAt: '2026-11-15T00:00:00Z',
			})),
			size: 20,
			hasNext,
			nextCursor: hasNext ? 'next' : null,
		},
		message: 'success',
		code: 'SUCCESS',
	})

const createDeferred = () => {
	let resolve!: () => void
	const promise = new Promise<void>(next => {
		resolve = next
	})
	return { promise, resolve }
}

const confirmModal = () =>
	act(() => {
		useModalStore.getState().confirm()
	})

describe('useIntegrationDisconnect', () => {
	it('service가 없으면 확인 modal을 열지 않는다', () => {
		const { result } = renderHook(() => useIntegrationDisconnect({ service: undefined, onDisconnected: vi.fn() }), {
			wrapper: createWrapper(),
		})

		act(() => result.current.disconnect())

		expect(useModalStore.getState().isOpen).toBe(false)
		expect(result.current.isDisconnecting).toBe(false)
	})

	// 버튼 disabled와 별개로 hook 자체가 진행 중 재호출을 막는지 확인한다.
	it('삭제 요청이 진행 중이면 다시 호출해도 확인 modal을 열지 않는다', async () => {
		let releaseDelete!: () => void
		const deleteResponse = new Promise<void>(resolve => {
			releaseDelete = resolve
		})
		server.use(
			http.delete('*/api/v1/webhook-credentials/:id', async () => {
				await deleteResponse
				return HttpResponse.json({ success: true, data: {}, message: 'success', code: 'SUCCESS' })
			})
		)
		const onDisconnected = vi.fn()
		const { result } = renderHook(() => useIntegrationDisconnect({ service, onDisconnected }), {
			wrapper: createWrapper(),
		})

		act(() => result.current.disconnect())
		confirmModal()
		await waitFor(() => expect(result.current.isDisconnecting).toBe(true))

		act(() => result.current.disconnect())
		expect(useModalStore.getState().isOpen).toBe(false)

		releaseDelete()
		await waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce())
	})

	it('Slack 봇 연결은 재초대 안내를 확인 문구에 붙이고 확인하면 Slack 해제 API를 호출한다', async () => {
		const deleteRequest = vi.fn()
		server.use(
			http.delete('*/api/v1/slack/oauth2/connection', () => {
				deleteRequest()
				return new HttpResponse(null, { status: 204 })
			})
		)
		const onDisconnected = vi.fn()
		const { result } = renderHook(() => useIntegrationDisconnect({ service: slackBotService, onDisconnected }), {
			wrapper: createWrapper(),
		})

		expect(result.current.canDisconnect).toBe(true)
		act(() => result.current.disconnect())
		expect(useModalStore.getState().message).toContain('비공개 채널에는 봇을 다시 초대해야 해요')

		confirmModal()

		await waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce())
		expect(deleteRequest).toHaveBeenCalledOnce()
	})

	it('Google 해제는 영향받는 워크플로우를 조회해 확인 문구에 넣고 확인하면 공용 해제 API를 호출한다', async () => {
		const workflowsRequest = vi.fn()
		const deleteRequest = vi.fn()
		server.use(
			http.get('*/api/v1/integrations/GOOGLE/workflows', () => {
				workflowsRequest()
				return workflowsResponse(['일정 알림', '주간 회의 정리'])
			}),
			http.delete('*/api/v1/oauth/connections/GOOGLE', () => {
				deleteRequest()
				return HttpResponse.json({ success: true, message: 'OK', code: 'OK' })
			})
		)
		const onDisconnected = vi.fn()
		const { result } = renderHook(() => useIntegrationDisconnect({ service: googleService, onDisconnected }), {
			wrapper: createWrapper(),
		})

		expect(result.current.canDisconnect).toBe(true)
		act(() => result.current.disconnect())
		// 조회가 끝나기 전에는 확인 modal을 열지 않는다.
		expect(useModalStore.getState().isOpen).toBe(false)
		expect(result.current.isCheckingAffectedWorkflows).toBe(true)

		await waitFor(() => expect(useModalStore.getState().isOpen).toBe(true))
		expect(result.current.isCheckingAffectedWorkflows).toBe(false)
		expect(useModalStore.getState().message).toContain('워크플로우 2개는 실행할 때 실패해요: 일정 알림, 주간 회의 정리.')
		expect(useModalStore.getState().message).toContain('Google 권한 동의를 다시 받아야 해요')
		expect(workflowsRequest).toHaveBeenCalledOnce()

		confirmModal()

		await waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce())
		expect(deleteRequest).toHaveBeenCalledOnce()
	})

	it('Google 워크플로우 조회가 실패해도 확인하지 못했다는 문구로 확인 modal을 연다', async () => {
		server.use(
			http.get('*/api/v1/integrations/GOOGLE/workflows', () =>
				HttpResponse.json(
					{ success: false, data: null, message: '서버 오류', code: 'INTERNAL_SERVER_ERROR' },
					{ status: 500 }
				)
			)
		)
		const { result } = renderHook(() => useIntegrationDisconnect({ service: googleService, onDisconnected: vi.fn() }), {
			wrapper: createWrapper(),
		})

		act(() => result.current.disconnect())

		await waitFor(() => expect(useModalStore.getState().isOpen).toBe(true))
		expect(useModalStore.getState().message).toContain('이 연결을 쓰는 워크플로우를 확인하지 못했어요.')
	})

	// 앱 QueryClient는 query를 3회 재시도한다(첫 재시도 1초 뒤). 해제 확인 조회가 이를 따르면 확인 modal이 수 초 늦게 뜬다.
	it('앱처럼 query 재시도가 켜진 QueryClient에서도 Google 워크플로우 조회 실패는 재시도 없이 바로 확인 modal을 연다', async () => {
		const workflowsRequest = vi.fn()
		server.use(
			http.get('*/api/v1/integrations/GOOGLE/workflows', () => {
				workflowsRequest()
				return HttpResponse.json(
					{ success: false, data: null, message: '서버 오류', code: 'INTERNAL_SERVER_ERROR' },
					{ status: 500 }
				)
			})
		)
		const queryClient = createAppQueryClient()
		const { result } = renderHook(() => useIntegrationDisconnect({ service: googleService, onDisconnected: vi.fn() }), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			),
		})

		act(() => result.current.disconnect())

		await waitFor(() => expect(useModalStore.getState().isOpen).toBe(true))
		expect(useModalStore.getState().message).toContain('이 연결을 쓰는 워크플로우를 확인하지 못했어요.')
		expect(workflowsRequest).toHaveBeenCalledOnce()
		queryClient.clear()
	})

	it('Google 워크플로우를 조회하는 중에는 다시 호출해도 확인 modal을 한 번만 연다', async () => {
		const response = createDeferred()
		const workflowsRequest = vi.fn()
		server.use(
			http.get('*/api/v1/integrations/GOOGLE/workflows', async () => {
				workflowsRequest()
				await response.promise
				return workflowsResponse([])
			})
		)
		const { result } = renderHook(() => useIntegrationDisconnect({ service: googleService, onDisconnected: vi.fn() }), {
			wrapper: createWrapper(),
		})

		// 확인 modal이 이미 열려 있으면 isOpen이 바뀌지 않으므로 openConfirm이 새 확인 동작을 넣은 횟수로 센다.
		let confirmOpenCount = 0
		const unsubscribe = useModalStore.subscribe((state, previous) => {
			if (state.onConfirm && state.onConfirm !== previous.onConfirm) confirmOpenCount += 1
		})

		act(() => result.current.disconnect())
		await waitFor(() => expect(workflowsRequest).toHaveBeenCalledOnce())
		act(() => result.current.disconnect())

		response.resolve()
		await waitFor(() => expect(useModalStore.getState().isOpen).toBe(true))
		await waitFor(() => expect(result.current.isCheckingAffectedWorkflows).toBe(false))
		unsubscribe()
		expect(confirmOpenCount).toBe(1)
		expect(workflowsRequest).toHaveBeenCalledOnce()
		expect(useModalStore.getState().message).toContain('이 연결을 쓰는 워크플로우는 없어요.')
	})

	it('Google 워크플로우 조회 응답 전에 언마운트하면 늦은 응답이 확인 modal을 열지 않는다', async () => {
		const response = createDeferred()
		const workflowsRequest = vi.fn()
		server.use(
			http.get('*/api/v1/integrations/GOOGLE/workflows', async () => {
				workflowsRequest()
				await response.promise
				return workflowsResponse(['일정 알림'])
			})
		)
		const queryClient = createTestQueryClient()
		const { result, unmount } = renderHook(
			() => useIntegrationDisconnect({ service: googleService, onDisconnected: vi.fn() }),
			{
				wrapper: ({ children }: { children: ReactNode }) => (
					<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
				),
			}
		)

		act(() => result.current.disconnect())
		await waitFor(() => expect(workflowsRequest).toHaveBeenCalledOnce())
		unmount()

		response.resolve()
		// 늦은 응답이 처리된 뒤를 기준으로 판정하도록 조회가 끝날 때까지 기다린다.
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it('해제 경로가 없는 OAuth 연결은 해제할 수 없고 확인 modal을 열지 않는다', () => {
		const { result } = renderHook(() => useIntegrationDisconnect({ service: githubService, onDisconnected: vi.fn() }), {
			wrapper: createWrapper(),
		})

		expect(result.current.canDisconnect).toBe(false)
		act(() => result.current.disconnect())

		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it('해제 요청이 실패하면 서버 메시지로 오류 modal을 열고 목록으로 돌아가지 않는다', async () => {
		server.use(
			http.delete('*/api/v1/slack/oauth2/connection', () =>
				HttpResponse.json(
					{ success: false, data: null, message: 'Slack 해제에 실패했어요.', code: 'INTERNAL_SERVER_ERROR' },
					{ status: 500 }
				)
			)
		)
		const onDisconnected = vi.fn()
		const { result } = renderHook(() => useIntegrationDisconnect({ service: slackBotService, onDisconnected }), {
			wrapper: createWrapper(),
		})

		act(() => result.current.disconnect())
		confirmModal()

		await waitFor(() => expect(useModalStore.getState().title).toBe('연결 해제 실패'))
		expect(useModalStore.getState().message).toBe('Slack 해제에 실패했어요.')
		expect(onDisconnected).not.toHaveBeenCalled()
	})

	it.each([
		['성공', () => new HttpResponse(null, { status: 204 })],
		[
			'실패',
			() =>
				HttpResponse.json(
					{ success: false, data: null, message: 'Slack 해제에 실패했어요.', code: 'INTERNAL_SERVER_ERROR' },
					{ status: 500 }
				),
		],
	])('응답 전에 언마운트하면 늦은 %s 응답이 목록 이동이나 오류 modal을 실행하지 않는다', async (_, respond) => {
		const response = createDeferred()
		const deleteRequest = vi.fn()
		server.use(
			http.delete('*/api/v1/slack/oauth2/connection', async () => {
				deleteRequest()
				await response.promise
				return respond()
			})
		)
		const onDisconnected = vi.fn()
		const queryClient = createTestQueryClient()
		const { result, unmount } = renderHook(() => useIntegrationDisconnect({ service: slackBotService, onDisconnected }), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			),
		})

		act(() => result.current.disconnect())
		confirmModal()
		await waitFor(() => expect(deleteRequest).toHaveBeenCalledOnce())
		unmount()

		response.resolve()
		// 늦은 응답이 처리된 뒤를 기준으로 판정하도록 mutation이 끝날 때까지 기다린다.
		await waitFor(() => expect(queryClient.isMutating()).toBe(0))
		expect(onDisconnected).not.toHaveBeenCalled()
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	// 같은 화면에서 목록으로 돌아가 다른 서비스 상세를 열면 훅은 마운트된 채 service만 바뀐다.
	it.each([
		['성공', () => new HttpResponse(null, { status: 204 })],
		[
			'실패',
			() =>
				HttpResponse.json(
					{ success: false, data: null, message: 'Slack 해제에 실패했어요.', code: 'INTERNAL_SERVER_ERROR' },
					{ status: 500 }
				),
		],
	])(
		'응답 전에 다른 서비스 상세로 바꾸면 이전 서비스의 늦은 %s 응답이 목록 이동이나 오류 modal을 실행하지 않는다',
		async (_, respond) => {
			const response = createDeferred()
			const deleteRequest = vi.fn()
			server.use(
				http.delete('*/api/v1/slack/oauth2/connection', async () => {
					deleteRequest()
					await response.promise
					return respond()
				})
			)
			const onDisconnected = vi.fn()
			const queryClient = createTestQueryClient()
			const { result, rerender } = renderHook(
				({ current }: { current: IntegrationService }) => useIntegrationDisconnect({ service: current, onDisconnected }),
				{
					initialProps: { current: slackBotService },
					wrapper: ({ children }: { children: ReactNode }) => (
						<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
					),
				}
			)

			act(() => result.current.disconnect())
			confirmModal()
			await waitFor(() => expect(deleteRequest).toHaveBeenCalledOnce())
			rerender({ current: service })

			response.resolve()
			await waitFor(() => expect(queryClient.isMutating()).toBe(0))
			expect(onDisconnected).not.toHaveBeenCalled()
			expect(useModalStore.getState().isOpen).toBe(false)
		}
	)
})
