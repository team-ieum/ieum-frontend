import { api } from '@/utils/AxiosInstance'
import {
	isOAuthConnectServiceId,
	OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID,
	type OAuthAuthorizeRequest,
} from '@/constants/integration/integrationProviders'
import { pickAuthorizationUrl } from '@/utils/integration/pickAuthorizationUrl'
import type { OAuthAuthorizeResponse } from '@/types/integrationOAuth'

const requestAuthorize = async (request: OAuthAuthorizeRequest) => {
	if (request.method === 'post') return api.post<OAuthAuthorizeResponse>(request.path, request.body)
	return api.get<OAuthAuthorizeResponse>(request.path, request.withCredentials ? { withCredentials: true } : undefined)
}

/**
 * 서비스의 OAuth 인가 URL을 받는다. OAuth로 연결할 수 없는 서비스면 `null`을 반환한다.
 * 공급자 설정이 `withCredentials`를 켠 경우에만 쿠키를 주고받는다(Slack·Discord nonce 쿠키).
 * Google은 받을 권한(scopeGroups)을 POST로 보내고, 돌려받은 URL의 link_token은 5분 뒤 만료된다.
 */
export const fetchIntegrationOAuthAuthorizeUrl = async (serviceId: string): Promise<string | null> => {
	if (!isOAuthConnectServiceId(serviceId)) return null
	const response = await requestAuthorize(OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID[serviceId])
	return pickAuthorizationUrl(response.data.data)
}
