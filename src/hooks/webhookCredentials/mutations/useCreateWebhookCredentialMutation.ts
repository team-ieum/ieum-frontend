import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { createWebhookCredential } from '@/api/webhookCredentials'
import { webhookCredentialsQueryKey } from '@/constants/queryKeys'
import type { CreateWebhookCredentialRequest, CreateWebhookCredentialResponse } from '@/types/webhookCredentials'

export const useCreateWebhookCredentialMutation = (): UseMutationResult<
	CreateWebhookCredentialResponse,
	Error,
	CreateWebhookCredentialRequest
> => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: CreateWebhookCredentialRequest) => createWebhookCredential(body),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: webhookCredentialsQueryKey })
		},
	})
}
