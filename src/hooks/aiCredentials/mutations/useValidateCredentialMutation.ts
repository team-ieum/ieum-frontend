import { useMutation, useQueryClient } from '@tanstack/react-query'
import { validateCredential } from '@/api/credential'
import { queryKeys } from '@/constants/queryKeys'

export const useValidateCredentialMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: validateCredential,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.credentials.all() })
		},
	})
}
