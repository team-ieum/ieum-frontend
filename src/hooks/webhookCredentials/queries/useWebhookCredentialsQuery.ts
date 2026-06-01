import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getWebhookCredentials } from '@/api/webhookCredentials'
import { webhookCredentialsQueryKey } from '@/constants/queryKeys'
import type { WebhookCredentialDto } from '@/types/webhookCredentials'

export const useWebhookCredentialsQuery = (): UseQueryResult<WebhookCredentialDto[], Error> =>
	useQuery({
		queryKey: webhookCredentialsQueryKey,
		queryFn: getWebhookCredentials,
		select: response => response.data,
	})
