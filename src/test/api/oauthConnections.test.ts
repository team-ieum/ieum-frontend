import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { server } from '@/mocks/server'

const PROVIDERS = ['NOTION', 'GITHUB'] as const

describe('deleteOAuthConnection', () => {
	it.each(PROVIDERS)('%s 연동 해제를 대문자 경로에 본문 없이 요청한다', async provider => {
		const observeRequest = vi.fn()
		const body = { success: true, data: null, message: 'OK', code: 'OK' }
		server.use(
			http.delete('*/api/v1/oauth/connections/:provider', async ({ params, request }) => {
				observeRequest(params.provider, await request.text())
				return HttpResponse.json(body)
			})
		)

		await expect(deleteOAuthConnection(provider)).resolves.toBeUndefined()
		expect(observeRequest).toHaveBeenCalledExactlyOnceWith(provider, '')
	})
})
