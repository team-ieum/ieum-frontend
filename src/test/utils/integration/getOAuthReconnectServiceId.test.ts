import { describe, expect, it } from 'vitest'
import type { IntegrationService } from '@/types/integration'
import { getOAuthReconnectServiceId } from '@/utils/integration/getOAuthReconnectServiceId'

const createService = (overrides: Partial<IntegrationService>): IntegrationService => ({
	id: 'oauth-1',
	name: 'Google',
	brand: 'google',
	status: 'connected',
	...overrides,
})

describe('getOAuthReconnectServiceId', () => {
	it('Google OAuth 연결은 Calendar 권한 연결 요청으로 다시 연결한다', () => {
		expect(getOAuthReconnectServiceId(createService({ origin: 'oauth', oauthProvider: 'GOOGLE' }))).toBe('google-calendar')
	})

	it.each([
		['Slack 봇', createService({ name: 'Slack', brand: 'slack', origin: 'oauth', oauthProvider: 'SLACK' })],
		['웹훅', createService({ name: '팀 Slack', brand: 'slack', origin: 'webhook' })],
		['공급자 없는 OAuth', createService({ origin: 'oauth' })],
	])('%s 연결은 다시 연결할 수 없다', (_, service) => {
		expect(getOAuthReconnectServiceId(service)).toBeNull()
	})

	it('서비스가 없으면 다시 연결할 수 없다', () => {
		expect(getOAuthReconnectServiceId(undefined)).toBeNull()
	})
})
