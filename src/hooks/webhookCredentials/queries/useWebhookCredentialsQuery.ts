import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { webhookCredentialsQueryOptions } from '@/hooks/webhookCredentials/queries/webhookCredentialsQueryOptions'
import type { WebhookCredentialDto } from '@/types/webhookCredentials'

export const useWebhookCredentialsQuery = (): UseQueryResult<WebhookCredentialDto[], Error> =>
	useQuery(webhookCredentialsQueryOptions())
