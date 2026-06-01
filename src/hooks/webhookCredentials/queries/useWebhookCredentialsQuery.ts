import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getWebhookCredentials } from '@/api/webhookCredentials'
import type { WebhookCredentialDto } from '@/types/webhookCredentials'

export const webhookCredentialsQueryKey = ['webhook-credentials', 'list'] as const

export const useWebhookCredentialsQuery = (): UseQueryResult<WebhookCredentialDto[], Error> =>
	useQuery({
		queryKey: webhookCredentialsQueryKey,
		queryFn: getWebhookCredentials,
		select: response => response.data,
	})
