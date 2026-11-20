import { isOAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'
import type {
	DeleteOAuthConnectionResponse,
	OAuthDisconnectProvider,
	OAuthDisconnectWorkflowsParams,
} from '@/types/oauthDisconnect'
import { api } from '@/utils/AxiosInstance'

const assertSupportedProvider = (provider: OAuthDisconnectProvider) => {
	if (!isOAuthDisconnectProvider(provider)) throw new Error(`해제할 수 없는 OAuth 공급자입니다: ${provider}`)
}

export const getOAuthDisconnectWorkflowsPage = async (
	provider: OAuthDisconnectProvider,
	params: OAuthDisconnectWorkflowsParams,
	signal?: AbortSignal
): Promise<IntegrationServiceWorkflowsResponse> => {
	assertSupportedProvider(provider)
	// 영향 조회는 명세의 소문자 serviceType을, 연결 해제는 대문자 provider를 사용한다.
	const response = await api.get<IntegrationServiceWorkflowsResponse>(
		`/api/v1/integrations/${provider.toLowerCase()}/workflows`,
		{
			params,
			signal,
		}
	)
	return response.data
}

export const deleteIntegrationOAuthConnection = async (
	provider: OAuthDisconnectProvider
): Promise<DeleteOAuthConnectionResponse> => {
	assertSupportedProvider(provider)
	const response = await api.delete<DeleteOAuthConnectionResponse>(`/api/v1/oauth/connections/${provider}`)
	return response.data
}
