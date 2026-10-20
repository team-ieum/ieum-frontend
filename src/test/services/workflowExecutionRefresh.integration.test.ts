import { act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { subscribeSSE } from '@/api/sse'
import { executeWorkflowTracked } from '@/services/workflowExecutionManager'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { api } from '@/utils/AxiosInstance'
import { server } from '@/mocks/server'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), subscribe: vi.fn() }))
vi.mock('@/api/workflow', () => ({ executeWorkflow: mocks.execute }))
vi.mock('@/api/sse', () => ({ subscribeSSE: mocks.subscribe }))
type Subscription = Parameters<typeof subscribeSSE>[0]
const subscriptions: Subscription[] = []
const expired = () => HttpResponse.json({ success: false, code: 'TOKEN_EXPIRED', message: 'expired' }, { status: 401 })
const deferred = () => {
	let resolve!: () => void
	const promise = new Promise<void>(yes => {
		resolve = yes
	})
	return { promise, resolve }
}

describe('SSE와 Axios의 실제 공용 refresh 계약', () => {
	afterEach(() => vi.unstubAllEnvs())
	beforeEach(() => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		subscriptions.length = 0
		mocks.execute.mockReset().mockResolvedValue({ data: { id: 'execution-a' } })
		mocks.subscribe.mockReset().mockImplementation((options: Subscription) => {
			subscriptions.push(options)
			return Promise.resolve()
		})
		useAuthStore.getState().setAuth('expired-access', 'original-refresh')
	})

	it('동시 SSE·API 401은 refresh POST 하나를 공유하고 실행 GET만 다시 연다', async () => {
		const gate = deferred()
		let refreshes = 0,
			apiRequests = 0
		server.use(
			http.get('*/api/v1/protected', ({ request }) => {
				apiRequests++
				return request.headers.get('Authorization') === 'Bearer renewed-access'
					? HttpResponse.json({ success: true, data: 'ok' })
					: expired()
			}),
			http.post('*/api/v1/auth/refresh', async ({ request }) => {
				refreshes++
				expect(await request.json()).toEqual({ refreshToken: 'original-refresh' })
				await gate.promise
				return HttpResponse.json({
					success: true,
					data: { accessToken: 'renewed-access', refreshToken: 'renewed-refresh' },
				})
			})
		)
		await executeWorkflowTracked('workflow-a')
		const request = api.get('https://api.example.com/api/v1/protected')
		act(() => subscriptions[0].onError?.({ status: 401 }))
		await waitFor(() => {
			expect(refreshes).toBe(1)
			expect(apiRequests).toBe(1)
		})
		gate.resolve()
		await request
		await waitFor(() => expect(subscriptions).toHaveLength(2))
		expect(refreshes).toBe(1)
		expect(apiRequests).toBe(2)
		expect(mocks.execute).toHaveBeenCalledTimes(1)
		expect(subscriptions[1].url).toBe(subscriptions[0].url)
		expect(subscriptions[1].token).toBe('renewed-access')
		expect(useExecutionStore.getState().executions['workflow-a']?.phase).toBe('running')
	})

	it('API 갱신 대기 중 계정이 바뀌면 이전 API를 재전송하거나 새 계정을 로그아웃하지 않는다', async () => {
		const gate = deferred()
		let refreshes = 0,
			requests = 0
		server.use(
			http.get('*/api/v1/protected', () => {
				requests++
				return expired()
			}),
			http.post('*/api/v1/auth/refresh', async () => {
				refreshes++
				await gate.promise
				return HttpResponse.json({
					success: true,
					data: { accessToken: 'old-session-renewed', refreshToken: 'old-session-refresh' },
				})
			})
		)
		const rejected = expect(api.get('https://api.example.com/api/v1/protected')).rejects.toMatchObject({ name: 'AbortError' })
		await waitFor(() => expect(refreshes).toBe(1))
		act(() => {
			useAuthStore.getState().clearAuth()
			useAuthStore.getState().setAuth('other-user', 'other-refresh')
		})
		gate.resolve()
		await rejected
		expect(requests).toBe(1)
		expect(useAuthStore.getState().accessToken).toBe('other-user')
	})

	it('직접 계정 전환은 전송 직전의 실제 실행 POST를 취소해 새 계정 토큰으로 보내지 않는다', async () => {
		const { executeWorkflow } = await vi.importActual<typeof import('@/api/workflow')>('@/api/workflow')
		mocks.execute.mockImplementation(executeWorkflow)
		let executionRequests = 0
		server.use(
			http.post('*/api/v1/workflows/workflow-a/execute', () => {
				executionRequests++
				return HttpResponse.json({ success: true, data: { id: 'execution-a' } })
			})
		)
		const run = executeWorkflowTracked('workflow-a')
		act(() => useAuthStore.getState().setAuth('account-b-access', 'account-b-refresh'))
		await expect(run).resolves.toBeUndefined()
		expect(executionRequests).toBe(0)
		expect(subscriptions).toHaveLength(0)
		expect(useExecutionStore.getState().executions).toEqual({})
		expect(useAuthStore.getState().accessToken).toBe('account-b-access')
	})

	it('갱신된 토큰도 거부되면 Axios도 갱신을 반복하지 않는다', async () => {
		let refreshes = 0,
			requests = 0
		server.use(
			http.get('*/api/v1/protected', () => {
				requests++
				return expired()
			}),
			http.post('*/api/v1/auth/refresh', () => {
				refreshes++
				return HttpResponse.json({
					success: true,
					data: { accessToken: 'rejected-renewed', refreshToken: 'renewed-refresh' },
				})
			})
		)
		await expect(api.get('https://api.example.com/api/v1/protected')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' })
		expect(refreshes).toBe(1)
		expect(requests).toBe(2)
	})
})
