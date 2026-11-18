import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { describe, expect, it } from 'vitest'
import { useIntegrationServicesViewModel } from '@/hooks/integration/useIntegrationServicesViewModel'
import { http, HttpResponse } from 'msw'
import { createPartialFailureHandlers, createResourceEmptyHandler, createResourceSuccessHandler } from '@/mocks/apiScenarios'
import { oauthConnectionsResponse, slackOAuthConnection } from '@/mocks/fixtures/integrations'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

describe('useIntegrationServicesViewModel', () => {
	it('두 source를 연결 서비스로 변환하고 catalog 제외와 count를 같은 파생 데이터에서 계산한다', async () => {
		const queryClient = createTestQueryClient()
		const { result } = renderHook(() => useIntegrationServicesViewModel(), { wrapper: createWrapper(queryClient) })

		try {
			expect(result.current.canResolveAvailable).toBe(false)
			expect(result.current.available).toEqual([])

			await waitFor(() => expect(result.current.canResolveAvailable).toBe(true))

			expect(result.current.connected).toEqual([
				expect.objectContaining({
					id: '55555555-5555-4555-8555-555555555555',
					name: '팀 Slack',
					brand: 'slack',
					origin: 'webhook',
				}),
				expect.objectContaining({
					id: 'oauth-66666666-6666-4666-8666-666666666666',
					name: 'Google',
					brand: 'google',
					origin: 'oauth',
				}),
			])
			const availableIds = result.current.available.map(service => service.id)
			// Slack 웹훅만 연결된 상태라 웹훅 타일만 빠지고 봇 타일은 남는다.
			expect(availableIds).toContain('slack')
			for (const excludedId of ['slack-webhook', 'google', 'gmail', 'sheets']) {
				expect(availableIds).not.toContain(excludedId)
			}
			expect(result.current.connectedCount).toBe(result.current.connected.length)
			expect(result.current.availableCount).toBe(result.current.available.length)
			expect(result.current.canNormalizeDetail).toBe(true)
		} finally {
			queryClient.clear()
		}
	})

	it('한 source가 실패하면 성공한 연결 데이터만 유지하고 available 확정을 보류한다', async () => {
		server.use(...createPartialFailureHandlers(['oauthConnections']))
		const queryClient = createTestQueryClient()
		const { result } = renderHook(() => useIntegrationServicesViewModel(), { wrapper: createWrapper(queryClient) })

		try {
			await waitFor(() => expect(result.current.oauthResource.isLoadingError).toBe(true))

			expect(result.current.connected).toEqual([
				expect.objectContaining({ id: '55555555-5555-4555-8555-555555555555', origin: 'webhook' }),
			])
			expect(result.current.available).toEqual([])
			expect(result.current.canResolveAvailable).toBe(false)
			expect(result.current.canNormalizeDetail).toBe(false)
			expect(result.current.hasDetailResolutionError).toBe(true)
			expect(result.current.webhookResource.isLoadingError).toBe(false)
		} finally {
			queryClient.clear()
		}
	})

	it('background refetch 중에는 기존 연결 및 available 데이터를 보존한다', async () => {
		const queryClient = createTestQueryClient()
		const { result } = renderHook(() => useIntegrationServicesViewModel(), { wrapper: createWrapper(queryClient) })

		try {
			await waitFor(() => expect(result.current.canResolveAvailable).toBe(true))
			const connected = result.current.connected
			const available = result.current.available
			server.use(createResourceSuccessHandler('webhookCredentials', 50))

			act(() => result.current.webhookResource.retry())
			await waitFor(() => expect(result.current.webhookResource.isRefetching).toBe(true))

			expect(result.current.connected).toEqual(connected)
			expect(result.current.available).toEqual(available)
			expect(result.current.canResolveAvailable).toBe(true)
			expect(result.current.canNormalizeDetail).toBe(false)
			await waitFor(() => expect(result.current.webhookResource.isRefetching).toBe(false))
		} finally {
			queryClient.clear()
		}
	})

	it('Slack 봇이 연결되면 봇 타일만 빼고 웹훅 타일은 남기며 카드에 워크스페이스 이름과 봇 방식을 표시한다', async () => {
		server.use(
			createResourceEmptyHandler('webhookCredentials'),
			http.get('*/api/v1/oauth/connections', () =>
				HttpResponse.json({ ...oauthConnectionsResponse, data: [slackOAuthConnection] })
			)
		)
		const queryClient = createTestQueryClient()
		const { result } = renderHook(() => useIntegrationServicesViewModel(), { wrapper: createWrapper(queryClient) })

		try {
			await waitFor(() => expect(result.current.canResolveAvailable).toBe(true))

			expect(result.current.connected).toEqual([
				expect.objectContaining({
					brand: 'slack',
					origin: 'oauth',
					oauthProvider: 'SLACK',
					connectionMethod: 'bot',
					account: '이음 팀',
				}),
			])
			const availableIds = result.current.available.map(service => service.id)
			expect(availableIds).not.toContain('slack')
			expect(availableIds).toContain('slack-webhook')
		} finally {
			queryClient.clear()
		}
	})
})
