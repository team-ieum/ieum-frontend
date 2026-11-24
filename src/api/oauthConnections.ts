import { api } from '@/utils/AxiosInstance'
import { OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'

export const getOAuthConnections = async (): Promise<OAuthConnectionsListResponse> => {
	const response = await api.get<OAuthConnectionsListResponse>('/api/v1/oauth/connections')
	return response.data
}

/**
 * 공급자의 OAuth 연결을 해제한다. 성공 응답(Slack 204, Google 200)의 본문은 쓰지 않는다.
 * Slack은 연결이 없어도 성공이고, Google은 연결이 없으면 400 `ACCOUNT_NOT_CONNECTED`다.
 * @throws 연동 화면에서 해제할 수 없는 공급자면 Error
 */
export const deleteOAuthConnection = async (provider: string, providerAccountId?: string): Promise<void> => {
	const config = OAUTH_DISCONNECT_BY_PROVIDER[provider.toUpperCase()]
	if (!config) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
	await api.delete(config.getPath(providerAccountId))
}
