import { queryOptions } from '@tanstack/react-query'
import { getWebhookCredentials } from '@/api/webhookCredentials'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const webhookCredentialsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.webhookCredentials.list(),
		queryFn: getWebhookCredentials,
		select: response => response.data,
		staleTime: QUERY_STALE_TIME_MS.webhookCredentials,
	})
