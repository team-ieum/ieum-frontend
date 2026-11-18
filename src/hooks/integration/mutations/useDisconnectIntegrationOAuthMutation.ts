import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteIntegrationOAuthConnection } from '@/api/oauthDisconnect'
import type { OAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import { queryKeys } from '@/constants/queryKeys'

export const disconnectIntegrationOAuthMutationKey = (provider: OAuthDisconnectProvider) =>
	[...queryKeys.oauthConnections.all(), 'disconnect-integration', provider] as const

export const useDisconnectIntegrationOAuthMutation = (provider: OAuthDisconnectProvider) => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: disconnectIntegrationOAuthMutationKey(provider),
		mutationFn: () => deleteIntegrationOAuthConnection(provider),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list(), exact: true })
		},
	})
}
