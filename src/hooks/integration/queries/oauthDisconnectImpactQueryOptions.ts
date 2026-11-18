import { queryOptions } from '@tanstack/react-query'
import { getAllIntegrationServiceWorkflows } from '@/api/oauthDisconnect'
import type { OAuthDisconnectProvider } from '@/constants/integration/oauthDisconnect'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import { getDisconnectImpact } from '@/utils/integration/getDisconnectImpact'

export const oauthDisconnectImpactQueryOptions = (provider: OAuthDisconnectProvider, connectionId: string) =>
	queryOptions({
		queryKey: queryKeys.integrations.oauthDisconnectImpact(provider, connectionId),
		queryFn: ({ signal }) => getAllIntegrationServiceWorkflows(provider, signal),
		select: getDisconnectImpact,
		staleTime: QUERY_STALE_TIME_MS.oauthDisconnectImpact,
		gcTime: 0,
		refetchOnMount: 'always',
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry: false,
	})
