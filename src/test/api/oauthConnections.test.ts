import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteIntegrationOAuthConnection } from '@/api/oauthDisconnect'
import { api } from '@/utils/AxiosInstance'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('deleteIntegrationOAuthConnection', () => {
	it.each(['NOTION', 'GITHUB'] as const)('%s 해제를 대문자 공급자 경로에 본문 없이 요청한다', async provider => {
		const sendDelete = vi.spyOn(api, 'delete').mockResolvedValue({ data: null })

		await expect(deleteIntegrationOAuthConnection(provider)).resolves.toBeUndefined()

		expect(sendDelete).toHaveBeenCalledExactlyOnceWith(`/api/v1/oauth/connections/${provider}`)
	})
})
