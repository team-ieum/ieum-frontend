import { useMutation, useQueryClient } from '@tanstack/react-query'
import { registerCredential } from '@/api/credential'
import { queryKeys } from '@/constants/queryKeys'

export const useRegisterCredentialMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: registerCredential,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.credentials.all() })
		},
	})
}
