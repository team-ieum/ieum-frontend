import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWebhookCredential } from '@/api/webhookCredentials'
import { webhookCredentialsQueryKey } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import type { CreateWebhookCredentialRequest } from '@/types/webhookCredentials'

export const useCreateWebhookCredentialMutation = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: CreateWebhookCredentialRequest) => createWebhookCredential(body),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: webhookCredentialsQueryKey })
		},
	})
}
