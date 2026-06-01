import { api } from '@/utils/AxiosInstance'
import { pickAuthorizationUrl } from '@/utils/integration/pickAuthorizationUrl'
import type { OAuthAuthorizeResponse } from '@/types/integrationOAuth'

export const getGithubOAuthAuthorizeUrl = async (): Promise<string> => {
	const response = await api.get<OAuthAuthorizeResponse>('/api/v1/github/oauth2/authorize')
	return pickAuthorizationUrl(response.data.data)
}

export const getNotionOAuthAuthorizeUrl = async (): Promise<string> => {
	const response = await api.get<OAuthAuthorizeResponse>('/api/v1/notion/oauth2/authorize')
	return pickAuthorizationUrl(response.data.data)
}

export const getGoogleOAuthAuthorizeUrl = async (): Promise<string> => {
	const response = await api.get<OAuthAuthorizeResponse>('/api/v1/oauth/google/authorize-url')
	const { data } = response.data
	if (typeof data === 'string') return data
	return pickAuthorizationUrl(data)
}
