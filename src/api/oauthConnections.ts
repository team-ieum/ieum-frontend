import { api } from '@/utils/AxiosInstance'
import { isCommonOAuthDisconnectProvider, OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'

export const getOAuthConnections = async (): Promise<OAuthConnectionsListResponse> => {
	const response = await api.get<OAuthConnectionsListResponse>('/api/v1/oauth/connections')
	return response.data
}

/**
 * 공급자의 OAuth 연결을 해제한다. Slack은 공용 API에서 처리되지 않아 전용 경로를 사용한다.
 * @throws 해제를 지원하지 않는 공급자면 Error
 */
export const deleteOAuthConnection = async (provider: string): Promise<void> => {
	const normalizedProvider = provider.toUpperCase()
	if (isCommonOAuthDisconnectProvider(normalizedProvider)) {
		await api.delete(`/api/v1/oauth/connections/${normalizedProvider}`)
		return
	}

	const config = OAUTH_DISCONNECT_BY_PROVIDER[normalizedProvider]
	if (!config) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
	await api.delete(config.path)
}
