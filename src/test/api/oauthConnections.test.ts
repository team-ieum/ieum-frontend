import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { api } from '@/utils/AxiosInstance'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('deleteOAuthConnection', () => {
	it.each([
		['google', '/api/v1/oauth/connections/GOOGLE'],
		['notion', '/api/v1/oauth/connections/NOTION'],
		['github', '/api/v1/oauth/connections/GITHUB'],
		['slack', '/api/v1/slack/oauth2/connection'],
	])('%s 해제를 %s로 요청한다', async (provider, path) => {
		const sendDelete = vi.spyOn(api, 'delete')

		await expect(deleteOAuthConnection(provider)).resolves.toBeUndefined()

		expect(sendDelete).toHaveBeenCalledExactlyOnceWith(path)
	})

	it('해제를 지원하지 않는 공급자에는 요청하지 않는다', async () => {
		const sendDelete = vi.spyOn(api, 'delete')

		await expect(deleteOAuthConnection('DISCORD')).rejects.toThrow('해제할 수 없는 OAuth 공급자입니다: DISCORD')

		expect(sendDelete).not.toHaveBeenCalled()
	})
})
