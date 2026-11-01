import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/utils/AxiosInstance'
import { ApiError } from '@/utils/ApiError'

describe('api 응답 interceptor', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('HTTP 2xx의 success: true 응답은 그대로 반환한다', async () => {
		const body = { success: true, data: { id: 'workflow-1' }, message: 'success', code: 'SUCCESS' }
		server.use(http.put('*/api/v1/workflows/:id', () => HttpResponse.json(body)))

		const response = await api.put('/api/v1/workflows/workflow-1', {})

		expect(response.data).toEqual(body)
	})

	it('HTTP 2xx의 success: false 응답을 ApiError로 거부한다', async () => {
		server.use(
			http.put('*/api/v1/workflows/:id', () =>
				HttpResponse.json({
					success: false,
					data: null,
					message: '웹훅 URL은 저장할 수 없어요.',
					code: 'INVALID_WORKFLOW',
				})
			)
		)

		const request = api.put('/api/v1/workflows/workflow-1', {})

		await expect(request).rejects.toBeInstanceOf(ApiError)
		await expect(request).rejects.toMatchObject({ code: 'INVALID_WORKFLOW', message: '웹훅 URL은 저장할 수 없어요.' })
	})

	it('code가 없는 HTTP 2xx 실패 응답은 INTERNAL_SERVER_ERROR로 거부한다', async () => {
		server.use(
			http.put('*/api/v1/workflows/:id', () =>
				HttpResponse.json({ success: false, data: null, message: '처리하지 못했어요.' })
			)
		)

		await expect(api.put('/api/v1/workflows/workflow-1', {})).rejects.toMatchObject({
			code: 'INTERNAL_SERVER_ERROR',
			message: '처리하지 못했어요.',
		})
	})

	it('HTTP 2xx 실패 응답의 data와 status를 ApiError에 보존한다', async () => {
		const data = { missingNodeIds: ['node-1', 'node-2'] }
		server.use(
			http.post('*/api/v1/workflows/:id/test', () =>
				HttpResponse.json({ success: false, data, message: '먼저 테스트할 노드가 있어요.', code: 'TEST_SAMPLE_MISSING' })
			)
		)

		await expect(api.post('/api/v1/workflows/workflow-1/test', {})).rejects.toMatchObject({
			code: 'TEST_SAMPLE_MISSING',
			data,
			status: 200,
		})
	})

	it('HTTP 오류 응답의 data와 status를 ApiError에 보존한다', async () => {
		const data = { errors: [{ nodeId: 'node-1', message: '필수 값을 입력해주세요.' }] }
		server.use(
			http.post('*/api/v1/workflows/:id/execute', () =>
				HttpResponse.json(
					{ success: false, data, message: '워크플로우 구성을 확인해주세요.', code: 'WORKFLOW_VALIDATION_FAILED' },
					{ status: 400 }
				)
			)
		)

		const request = api.post('/api/v1/workflows/workflow-1/execute', {})

		await expect(request).rejects.toBeInstanceOf(ApiError)
		await expect(request).rejects.toMatchObject({
			code: 'WORKFLOW_VALIDATION_FAILED',
			message: '워크플로우 구성을 확인해주세요.',
			data,
			status: 400,
		})
	})

	it('갱신할 refresh token이 없는 토큰 만료 응답도 data와 status를 보존한다', async () => {
		// 인터셉터가 로그인 화면으로 보내므로 jsdom의 실제 이동을 막는다. 요청 URL 해석에 쓰이므로 href는 유지한다.
		vi.stubGlobal('location', { ...window.location, href: window.location.href })
		useAuthStore.getState().setAuth('expired-access-token', '')
		const data = { expiredAt: '2026-11-02T00:00:00Z' }
		server.use(
			http.get('*/api/v1/workflows', () =>
				HttpResponse.json(
					{ success: false, data, message: '로그인이 만료되었어요.', code: 'TOKEN_EXPIRED' },
					{ status: 401 }
				)
			)
		)

		await expect(api.get('/api/v1/workflows')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', data, status: 401 })
		expect(window.location.href).toBe('/auth')
	})
})
