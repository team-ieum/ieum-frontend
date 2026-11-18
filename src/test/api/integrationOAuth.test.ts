import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchIntegrationOAuthAuthorizeUrl } from '@/api/integrationOAuth'
import { api } from '@/utils/AxiosInstance'

afterEach(() => {
	vi.restoreAllMocks()
})

const mockAuthorizeResponse = (data: Record<string, string>) =>
	vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data, message: 'OK', code: 'OK' } })

describe('fetchIntegrationOAuthAuthorizeUrl', () => {
	// nonce 쿠키가 실리지 않으면 Slack 콜백이 모두 slack_state_mismatch로 실패한다.
	it('Slack authorize 요청만 withCredentials를 켜고 authUrl을 반환한다', async () => {
		const get = mockAuthorizeResponse({ authUrl: 'https://slack.com/oauth/v2/authorize?state=s' })

		await expect(fetchIntegrationOAuthAuthorizeUrl('slack')).resolves.toBe('https://slack.com/oauth/v2/authorize?state=s')
		expect(get).toHaveBeenCalledWith('/api/v1/slack/oauth2/authorize', { withCredentials: true })
	})

	it('GitHub authorize 요청은 자격 증명 옵션 없이 보낸다', async () => {
		const get = mockAuthorizeResponse({ authorizationUrl: 'https://github.com/login/oauth/authorize' })

		await fetchIntegrationOAuthAuthorizeUrl('github')

		expect(get).toHaveBeenCalledWith('/api/v1/github/oauth2/authorize', undefined)
	})

	it('Google Calendar 연결은 calendar 권한 묶음을 POST로 보내고 authorizationUrl을 반환한다', async () => {
		const get = vi.spyOn(api, 'get')
		const post = vi.spyOn(api, 'post').mockResolvedValue({
			data: {
				success: true,
				data: { authorizationUrl: '/api/v1/oauth2/authorize/google?scope_groups=calendar&link_token=t' },
				message: 'OK',
				code: 'OK',
			},
		})

		await expect(fetchIntegrationOAuthAuthorizeUrl('google-calendar')).resolves.toBe(
			'/api/v1/oauth2/authorize/google?scope_groups=calendar&link_token=t'
		)
		expect(post).toHaveBeenCalledWith('/api/v1/oauth/google/connect', { scopeGroups: ['calendar'] })
		expect(get).not.toHaveBeenCalled()
	})

	it('OAuth로 연결할 수 없는 서비스는 요청하지 않고 null을 반환한다', async () => {
		const get = vi.spyOn(api, 'get')

		await expect(fetchIntegrationOAuthAuthorizeUrl('slack-webhook')).resolves.toBeNull()
		expect(get).not.toHaveBeenCalled()
	})
})
