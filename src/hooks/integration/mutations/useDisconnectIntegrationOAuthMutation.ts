import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteIntegrationOAuthConnection } from '@/api/oauthDisconnect'
import { queryKeys } from '@/constants/queryKeys'
import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import { isApiError } from '@/utils/ApiError'

// 해제 API의 오류 코드는 공용 ApiErrorCode 목록 밖에서도 올 수 있다.
const ACCOUNT_NOT_CONNECTED_CODE: string = 'ACCOUNT_NOT_CONNECTED'

export const disconnectIntegrationOAuthMutationKey = (provider: OAuthDisconnectProvider) =>
	[...queryKeys.oauthConnections.all(), 'disconnect-integration', provider] as const

export const useDisconnectIntegrationOAuthMutation = (provider: OAuthDisconnectProvider) => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: disconnectIntegrationOAuthMutationKey(provider),
		scope: { id: `oauth-disconnect-${provider}` },
		mutationFn: async () => {
			try {
				await deleteIntegrationOAuthConnection(provider)
			} catch (error) {
				// 다른 화면에서 먼저 해제한 경우에도 연결 목록을 갱신한다.
				if (!isApiError(error) || error.code !== ACCOUNT_NOT_CONNECTED_CODE) throw error
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list(), exact: true })
		},
	})
}
