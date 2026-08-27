import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteCredential } from '@/api/credential'
import { queryKeys } from '@/constants/queryKeys'

export const useDeleteCredentialMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: deleteCredential,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.credentials.all() })
		},
	})
}
