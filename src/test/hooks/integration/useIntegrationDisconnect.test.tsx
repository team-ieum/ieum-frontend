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

const service = { id: 'webhook-1', name: '팀 Slack' } as IntegrationService

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
		act(() => {
			useModalStore.getState().onConfirm?.()
			useModalStore.getState().close()
		})
		await waitFor(() => expect(result.current.isDisconnecting).toBe(true))

		act(() => result.current.disconnect())
		expect(useModalStore.getState().isOpen).toBe(false)

		releaseDelete()
		await waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce())
	})
})
