import { OAUTH_RECONNECT_SERVICE_ID_BY_PROVIDER, type OAuthConnectServiceId } from '@/constants/integration/integrationProviders'
import type { IntegrationService } from '@/types/integration'

/** 연결된 OAuth 서비스를 다시 연결할 때 쓸 연결 요청 id. 다시 연결할 수 없는 서비스면 `null`이다. */
export const getOAuthReconnectServiceId = (service: IntegrationService | undefined): OAuthConnectServiceId | null => {
	if (service?.origin !== 'oauth' || !service.oauthProvider) return null
	return OAUTH_RECONNECT_SERVICE_ID_BY_PROVIDER[service.oauthProvider] ?? null
}
