import { queryOptions } from '@tanstack/react-query'
import { getOAuthConnections } from '@/api/oauthConnections'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const oauthConnectionsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.oauthConnections.list(),
		queryFn: getOAuthConnections,
		select: response => response.data,
		staleTime: QUERY_STALE_TIME_MS.oauthConnections,
	})
