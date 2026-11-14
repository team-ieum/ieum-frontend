import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { IntegrationService } from '@/types/integration'

/** 연동 화면에서 해제할 수 있는 연결인지 판별한다. 웹훅은 항상, OAuth는 해제 경로가 정의된 공급자만 해제할 수 있다. */
export const canDisconnectIntegrationService = (service: IntegrationService): boolean => {
	if (service.origin === 'webhook') return true
	return (
		service.origin === 'oauth' && service.oauthProvider !== undefined && service.oauthProvider in OAUTH_DISCONNECT_BY_PROVIDER
	)
}
