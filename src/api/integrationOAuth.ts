import { api } from '@/utils/AxiosInstance'
import { GOOGLE_OAUTH_TILES, isGoogleOAuthTileId } from '@/constants/integration/googleOAuth'
import { isOAuthConnectServiceId, OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID } from '@/constants/integration/integrationProviders'
import { pickAuthorizationUrl } from '@/utils/integration/pickAuthorizationUrl'
import type { GoogleOAuthConnectRequest, GoogleOAuthConnectResponse, OAuthAuthorizeResponse } from '@/types/integrationOAuth'

/**
 * 서비스의 OAuth 인가 URL을 받는다. OAuth로 연결할 수 없는 서비스면 `null`을 반환한다.
 * Google은 로그인 중인 계정에 타일별 권한을 연동하고, Slack은 nonce 쿠키를 주고받는다.
 */
export const fetchIntegrationOAuthAuthorizeUrl = async (serviceId: string): Promise<string | null> => {
	if (isGoogleOAuthTileId(serviceId)) {
		const body: GoogleOAuthConnectRequest = { scopeGroups: [GOOGLE_OAUTH_TILES[serviceId].group] }
		const response = await api.post<GoogleOAuthConnectResponse>('/api/v1/oauth/google/connect', body)
		const url = response.data.data?.authorizationUrl
		if (typeof url !== 'string' || !url) throw new Error('인가 URL을 받지 못했습니다.')
		return url
	}

	if (!isOAuthConnectServiceId(serviceId)) return null
	const request: { path: string; withCredentials?: boolean } = OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID[serviceId]
	const response = await api.get<OAuthAuthorizeResponse>(
		request.path,
		request.withCredentials ? { withCredentials: true } : undefined
	)
	return pickAuthorizationUrl(response.data.data)
}
