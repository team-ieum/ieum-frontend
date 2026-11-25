import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { server } from '@/mocks/server'
import { api } from '@/utils/AxiosInstance'

const PROVIDERS = ['NOTION', 'GITHUB'] as const

afterEach(() => {
	vi.restoreAllMocks()
})

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

	it('Discord는 서버 ID로 그 서버 연결만 해제한다', async () => {
		const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })

		await deleteOAuthConnection('DISCORD', '1490935305161801760')

		expect(remove).toHaveBeenCalledWith('/api/v1/discord/oauth2/connections/1490935305161801760')
	})

	// 서버 ID가 빠진 채 보내면 ID 없는 경로(`…/connections/`)로 요청이 나가므로 요청 전에 막는다.
	it.each([undefined, ''])('Discord 서버 ID가 비면(%j) 요청 없이 실패한다', async providerAccountId => {
		const remove = vi.spyOn(api, 'delete')

		await expect(deleteOAuthConnection('DISCORD', providerAccountId)).rejects.toThrow('해제할 Discord 서버 ID가 없습니다.')
		expect(remove).not.toHaveBeenCalled()
	})

	it('연결이 하나뿐인 Slack은 계정 ID 없이 공급자 해제 경로를 부른다', async () => {
		const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })

		await deleteOAuthConnection('slack')

		expect(remove).toHaveBeenCalledWith('/api/v1/slack/oauth2/connection')
	})

	it('연동 화면에서 해제할 수 없는 공급자는 요청 없이 실패한다', async () => {
		const remove = vi.spyOn(api, 'delete')

		await expect(deleteOAuthConnection('UNKNOWN')).rejects.toThrow('해제할 수 없는 OAuth 공급자입니다: UNKNOWN')
		expect(remove).not.toHaveBeenCalled()
	})
})
