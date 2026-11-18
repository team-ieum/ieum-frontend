import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import { useOAuthDisconnectPreview } from '@/hooks/integration/useOAuthDisconnectPreview'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { registerHarnessCleanup } from '@/test/harnessCleanup'
import { api } from '@/utils/AxiosInstance'

const createDeferred = () => {
	let resolve!: () => void
	const promise = new Promise<void>(next => {
		resolve = next
	})
	return { promise, resolve }
}

const emptyImpactResponse = () =>
	HttpResponse.json({
		success: true,
		data: { content: [], size: 100, hasNext: false, nextCursor: null },
		message: 'success',
		code: 'SUCCESS',
	})

const createPreviewHarness = () => {
	const queryClient = createTestQueryClient()
	registerHarnessCleanup(() => queryClient.clear())
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	return {
		queryClient,
		renderPreview: (provider: OAuthDisconnectProvider, connectionId: string) => {
			const onDisconnected = vi.fn()
			const onCancel = vi.fn()
			const rendered = renderHook(() => useOAuthDisconnectPreview({ provider, connectionId, onDisconnected, onCancel }), {
				wrapper: Wrapper,
			})
			return { ...rendered, onDisconnected, onCancel }
		},
	}
}

afterEach(() => vi.restoreAllMocks())

describe('useOAuthDisconnectPreview', () => {
	it('영향 조회가 끝나기 전에 확인할 수 없고 화면을 떠나면 진행 중인 조회를 취소한다', async () => {
		const response = createDeferred()
		const started = vi.fn()
		const deleteRequest = vi.fn()
		// jsdom의 XHR 경로에서는 MSW의 Request.signal이 Axios에 전달된 신호와 연결되지 않는다.
		const get = vi.spyOn(api, 'get')
		server.use(
			http.get('*/api/v1/integrations/github/workflows', async () => {
				started()
				await response.promise
				return emptyImpactResponse()
			}),
			http.delete('*/api/v1/oauth/connections/:provider', ({ params }) => {
				deleteRequest(params.provider)
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { renderPreview } = createPreviewHarness()
		const preview = renderPreview('GITHUB', 'oauth-github')
		try {
			await waitFor(() => expect(started).toHaveBeenCalledOnce())
			const signal = get.mock.calls[0]?.[1]?.signal
			expect(signal?.aborted).toBe(false)
			act(() => {
				void preview.result.current.onConfirm()
			})
			expect(preview.result.current.impact).toBeUndefined()
			preview.unmount()
			expect(signal?.aborted).toBe(true)
		} finally {
			response.resolve()
		}

		expect(deleteRequest).not.toHaveBeenCalled()
		expect(preview.onDisconnected).not.toHaveBeenCalled()
	})

	it('화면을 다시 열어도 같은 공급자의 해제가 중복되지 않고 다른 공급자는 해제할 수 있다', async () => {
		const firstGitHubResponse = createDeferred()
		const deleteRequest = vi.fn()
		let didStartGitHubDelete = false
		server.use(
			http.get('*/api/v1/integrations/:serviceType/workflows', emptyImpactResponse),
			http.delete('*/api/v1/oauth/connections/:provider', async ({ params }) => {
				deleteRequest(params.provider)
				if (params.provider === 'GITHUB' && !didStartGitHubDelete) {
					didStartGitHubDelete = true
					await firstGitHubResponse.promise
				}
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { queryClient, renderPreview } = createPreviewHarness()
		const first = renderPreview('GITHUB', 'oauth-github')
		try {
			await waitFor(() => expect(first.result.current.impact).toBeDefined())
			act(() => {
				void first.result.current.onConfirm()
			})
			await waitFor(() => expect(deleteRequest).toHaveBeenCalledExactlyOnceWith('GITHUB'))
			first.unmount()

			const reopened = renderPreview('GITHUB', 'oauth-github')
			await waitFor(() => expect(reopened.result.current.impact).toBeDefined())
			act(() => {
				void reopened.result.current.onConfirm()
			})

			const notion = renderPreview('NOTION', 'oauth-notion')
			await waitFor(() => expect(notion.result.current.impact).toBeDefined())
			act(() => {
				void notion.result.current.onConfirm()
			})
			await waitFor(() => expect(notion.onDisconnected).toHaveBeenCalledOnce())
			expect(deleteRequest.mock.calls).toEqual([['GITHUB'], ['NOTION']])

			firstGitHubResponse.resolve()
			await waitFor(() => expect(queryClient.isMutating()).toBe(0))
			expect(deleteRequest.mock.calls).toEqual([['GITHUB'], ['NOTION']])
			expect(first.onDisconnected).not.toHaveBeenCalled()
			expect(reopened.onDisconnected).not.toHaveBeenCalled()
		} finally {
			firstGitHubResponse.resolve()
		}
	})
})
