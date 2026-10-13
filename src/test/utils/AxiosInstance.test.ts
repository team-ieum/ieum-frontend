import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { api } from '@/utils/AxiosInstance'
import { ApiError } from '@/utils/ApiError'

describe('api 응답 interceptor', () => {
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
})
