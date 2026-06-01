import { api } from '@/utils/AxiosInstance'
import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'

export const getOAuthConnections = async (): Promise<OAuthConnectionsListResponse> => {
	const response = await api.get<OAuthConnectionsListResponse>('/api/v1/oauth/connections')
	return response.data
}
