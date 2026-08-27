import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteWebhookCredential } from '@/api/webhookCredentials'
import { queryKeys } from '@/constants/queryKeys'

export const useDeleteWebhookCredentialMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => deleteWebhookCredential(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.webhookCredentials.list() })
		},
	})
}
