import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteOAuthConnection } from '@/api/oauthConnections'
import { queryKeys } from '@/constants/queryKeys'

export const useDeleteOAuthConnectionMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: deleteOAuthConnection,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list(), exact: true })
		},
	})
}
