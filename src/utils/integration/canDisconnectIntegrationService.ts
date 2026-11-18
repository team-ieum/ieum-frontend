import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { IntegrationService } from '@/types/integration'

/** 웹훅·Slack 봇의 일반 확인창을 사용할 수 있는지 판별한다. 공용 OAuth 해제는 별도 영향 확인창에서 처리한다. */
export const canDisconnectIntegrationService = (service: IntegrationService): boolean => {
	if (service.origin === 'webhook') return true
	return (
		service.origin === 'oauth' && service.oauthProvider !== undefined && service.oauthProvider in OAUTH_DISCONNECT_BY_PROVIDER
	)
}
