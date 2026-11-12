import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
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
const googleService = { id: 'oauth-2', name: 'Google Drive', origin: 'oauth', oauthProvider: 'GOOGLE' } as IntegrationService

const createDeferred = () => {
	let resolve!: () => void
	const promise = new Promise<void>(next => {
		resolve = next
	})
	return { promise, resolve }
}

const confirmModal = () =>
	act(() => {
		useModalStore.getState().onConfirm?.()
		useModalStore.getState().close()
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

	it('해제 경로가 없는 OAuth 연결은 해제할 수 없고 확인 modal을 열지 않는다', () => {
		const { result } = renderHook(() => useIntegrationDisconnect({ service: googleService, onDisconnected: vi.fn() }), {
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
})
