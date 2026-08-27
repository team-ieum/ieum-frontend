import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { oauthConnectionsQueryOptions } from '@/hooks/oauthConnections/queries/oauthConnectionsQueryOptions'
import type { OAuthConnectionDto } from '@/types/oauthConnections'

export const useOAuthConnectionsQuery = (): UseQueryResult<OAuthConnectionDto[], Error> =>
	useQuery(oauthConnectionsQueryOptions())
