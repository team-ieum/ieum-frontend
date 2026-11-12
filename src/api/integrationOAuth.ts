import { api } from '@/utils/AxiosInstance'
import { isOAuthConnectServiceId, OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID } from '@/constants/integration/integrationProviders'
import { pickAuthorizationUrl } from '@/utils/integration/pickAuthorizationUrl'
import type { OAuthAuthorizeResponse } from '@/types/integrationOAuth'

/**
 * 서비스의 OAuth 인가 URL을 받는다. OAuth로 연결할 수 없는 서비스면 `null`을 반환한다.
 * 공급자 설정이 `withCredentials`를 켠 경우에만 쿠키를 주고받는다(Slack nonce 쿠키).
 */
export const fetchIntegrationOAuthAuthorizeUrl = async (serviceId: string): Promise<string | null> => {
	if (!isOAuthConnectServiceId(serviceId)) return null
	const request: { path: string; withCredentials?: boolean } = OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID[serviceId]
	const response = await api.get<OAuthAuthorizeResponse>(
		request.path,
		request.withCredentials ? { withCredentials: true } : undefined
	)
	return pickAuthorizationUrl(response.data.data)
}
