import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useRegisterCredentialMutation } from '@/hooks/aiCredentials/mutations/useRegisterCredentialMutation'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import { useCreateWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useCreateWebhookCredentialMutation'
import { useWebhookCredentialsQuery } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import { useCreateWorkflowMutation } from '@/hooks/workflow/mutations/useCreateWorkflowMutation'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import { credentialsResponse } from '@/mocks/fixtures/aiCredentials'
import { webhookCredentialsResponse } from '@/mocks/fixtures/integrations'
import { workflowDetailResponse, workflowListResponse } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

describe('mutation query invalidation', () => {
	it('workflow 생성 성공 후 workflows prefix를 무효화해 active list를 refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeListRequest = vi.fn()
		server.use(
			http.get('*/api/v1/workflows', () => {
				observeListRequest()
				return HttpResponse.json(workflowListResponse)
			}),
			http.post('*/api/v1/workflows', () => HttpResponse.json(workflowDetailResponse))
		)
		const { result } = renderHook(() => ({ query: useWorkflowListQuery(), mutation: useCreateWorkflowMutation() }), {
			wrapper: createWrapper(queryClient),
		})
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await act(async () => {
			await result.current.mutation.mutateAsync({ name: '새 워크플로우' })
		})

		await waitFor(() => expect(observeListRequest).toHaveBeenCalledTimes(2))
		queryClient.clear()
	})

	it('credential 등록 성공 후 credentials prefix를 무효화해 active list를 refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeCredentialsRequest = vi.fn()
		server.use(
			http.get('*/api/v1/credentials', () => {
				observeCredentialsRequest()
				return HttpResponse.json(credentialsResponse)
			}),
			http.post('*/api/v1/credentials', () =>
				HttpResponse.json({ ...credentialsResponse, data: credentialsResponse.data[0] })
			)
		)
		const { result } = renderHook(() => ({ query: useCredentialsQuery(), mutation: useRegisterCredentialMutation() }), {
			wrapper: createWrapper(queryClient),
		})
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await act(async () => {
			await result.current.mutation.mutateAsync({
				provider: 'GEMINI',
				credentialType: 'API_KEY',
				displayName: '테스트 키',
				apiKey: 'test-api-key',
			})
		})

		await waitFor(() => expect(observeCredentialsRequest).toHaveBeenCalledTimes(2))
		queryClient.clear()
	})

	it('webhook 생성 성공 후 exact list key를 무효화해 active list를 refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeWebhookRequest = vi.fn()
		server.use(
			http.get('*/api/v1/webhook-credentials', () => {
				observeWebhookRequest()
				return HttpResponse.json(webhookCredentialsResponse)
			}),
			http.post('*/api/v1/webhook-credentials', () =>
				HttpResponse.json({ ...webhookCredentialsResponse, data: webhookCredentialsResponse.data[0] })
			)
		)
		const { result } = renderHook(
			() => ({ query: useWebhookCredentialsQuery(), mutation: useCreateWebhookCredentialMutation() }),
			{ wrapper: createWrapper(queryClient) }
		)
		await waitFor(() => expect(result.current.query.isSuccess).toBe(true))

		await act(async () => {
			await result.current.mutation.mutateAsync({
				provider: 'SLACK',
				displayName: '새 Slack',
				webhookUrl: 'https://example.com/webhook',
			})
		})

		await waitFor(() => expect(observeWebhookRequest).toHaveBeenCalledTimes(2))
		queryClient.clear()
	})

	it('webhook mutation은 API 성공 후 완료되고 active list refetch는 background에서 계속한다', async () => {
		const queryClient = createTestQueryClient()
		let webhookRequestCount = 0
		let releaseRefetch = () => {}
		const refetchGate = new Promise<void>(resolve => {
			releaseRefetch = resolve
		})
		const refreshedWebhookCredentialsResponse = {
			...webhookCredentialsResponse,
			data: [
				...webhookCredentialsResponse.data,
				{
					...webhookCredentialsResponse.data[0],
					id: '77777777-7777-4777-8777-777777777777',
					displayName: '새 Slack',
				},
			],
		}
		server.use(
			http.get('*/api/v1/webhook-credentials', async () => {
				webhookRequestCount += 1
				if (webhookRequestCount === 1) return HttpResponse.json(webhookCredentialsResponse)
				await refetchGate
				return HttpResponse.json(refreshedWebhookCredentialsResponse)
			}),
			http.post('*/api/v1/webhook-credentials', () =>
				HttpResponse.json({ ...webhookCredentialsResponse, data: webhookCredentialsResponse.data[0] })
			)
		)
		const { result } = renderHook(
			() => ({ query: useWebhookCredentialsQuery(), mutation: useCreateWebhookCredentialMutation() }),
			{ wrapper: createWrapper(queryClient) }
		)

		try {
			await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
			await act(async () => {
				await result.current.mutation.mutateAsync({
					provider: 'SLACK',
					displayName: '새 Slack',
					webhookUrl: 'https://example.com/webhook',
				})
			})
			await waitFor(() => expect(webhookRequestCount).toBe(2))

			expect(result.current.mutation.isPending).toBe(false)
			expect(result.current.query.isFetching).toBe(true)
			expect(result.current.query.data).toEqual(webhookCredentialsResponse.data)

			await act(async () => releaseRefetch())
			await waitFor(() => {
				expect(result.current.query.isFetching).toBe(false)
				expect(result.current.query.data).toEqual(refreshedWebhookCredentialsResponse.data)
			})
		} finally {
			releaseRefetch()
			queryClient.clear()
		}
	})
})
