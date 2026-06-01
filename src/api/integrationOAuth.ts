import { api } from '@/utils/AxiosInstance'
import {
	isOAuthConnectServiceId,
	OAUTH_AUTHORIZE_PATH_BY_SERVICE_ID,
	type OAuthConnectServiceId,
} from '@/constants/integration/integrationProviders'
import { pickAuthorizationUrl } from '@/utils/integration/pickAuthorizationUrl'
import type { OAuthAuthorizeResponse } from '@/types/integrationOAuth'

const fetchOAuthAuthorizeUrl = async (path: string): Promise<string> => {
	const response = await api.get<OAuthAuthorizeResponse>(path)
	return pickAuthorizationUrl(response.data.data)
}

export const fetchIntegrationOAuthAuthorizeUrl = async (serviceId: string): Promise<string | null> => {
	if (!isOAuthConnectServiceId(serviceId)) return null
	return fetchOAuthAuthorizeUrl(OAUTH_AUTHORIZE_PATH_BY_SERVICE_ID[serviceId as OAuthConnectServiceId])
}
