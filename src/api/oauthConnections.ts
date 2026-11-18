import { isApiError } from '@/utils/ApiError'
import { api } from '@/utils/AxiosInstance'
import { isCommonOAuthDisconnectProvider, OAUTH_DISCONNECT_BY_PROVIDER } from '@/constants/integration/integrationProviders'
import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'

export const getOAuthConnections = async (): Promise<OAuthConnectionsListResponse> => {
	const response = await api.get<OAuthConnectionsListResponse>('/api/v1/oauth/connections')
	return response.data
}

/**
 * 공용 OAuth 연결은 다른 탭에서 이미 해제한 경우에도 완료로 처리한다. Slack은 전용 경로를 사용한다.
 * @throws 해제를 지원하지 않는 공급자면 Error
 */
export const deleteOAuthConnection = async (provider: string): Promise<void> => {
	const normalizedProvider = provider.toUpperCase()
	if (isCommonOAuthDisconnectProvider(normalizedProvider)) {
		try {
			await api.delete(`/api/v1/oauth/connections/${normalizedProvider}`)
		} catch (error) {
			if (!isApiError(error) || error.code !== 'ACCOUNT_NOT_CONNECTED') throw error
		}
		return
	}

	const config = OAUTH_DISCONNECT_BY_PROVIDER[normalizedProvider]
	if (!config) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
	await api.delete(config.path)
}
