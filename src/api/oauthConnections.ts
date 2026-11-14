import { api } from '@/utils/AxiosInstance'
import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'

export const getOAuthConnections = async (): Promise<OAuthConnectionsListResponse> => {
	const response = await api.get<OAuthConnectionsListResponse>('/api/v1/oauth/connections')
	return response.data
}

/**
 * 공급자의 OAuth 연결을 해제한다. 서버는 204(본문 없음)를 돌려주고, 연결이 없어도 성공으로 처리한다.
 * @throws 연동 화면에서 해제할 수 없는 공급자면 Error
 */
export const deleteOAuthConnection = async (provider: string): Promise<void> => {
	const config = OAUTH_DISCONNECT_BY_PROVIDER[provider.toUpperCase()]
	if (!config) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
	await api.delete(config.path)
}
