import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { queryKeys } from '@/constants/queryKeys'

export const DELETE_OAUTH_CONNECTION_MUTATION_KEY = [...queryKeys.oauthConnections.all(), 'delete'] as const

export const useDeleteOAuthConnectionMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: DELETE_OAUTH_CONNECTION_MUTATION_KEY,
		mutationFn: deleteOAuthConnection,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list(), exact: true })
		},
	})
}
