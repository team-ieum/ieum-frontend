import { useQuery } from '@tanstack/react-query'
import { getWebhookCredentials } from '@/api/webhookCredentials'

export const webhookCredentialsQueryKey = ['webhook-credentials', 'list'] as const

export const useWebhookCredentialsQuery = () =>
	useQuery({
		queryKey: webhookCredentialsQueryKey,
		queryFn: getWebhookCredentials,
		select: response => response.data,
	})
