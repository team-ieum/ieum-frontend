import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { queryKeys } from '@/constants/queryKeys'
import type { OAuthConnectionTarget } from '@/types/oauthConnections'

export const useDeleteOAuthConnectionMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ provider, providerAccountId }: OAuthConnectionTarget) =>
			deleteOAuthConnection(provider, providerAccountId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list() })
		},
	})
}
