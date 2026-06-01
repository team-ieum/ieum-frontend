import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getOAuthConnections } from '@/api/oauthConnections'
import type { OAuthConnectionDto } from '@/types/oauthConnections'

export const oauthConnectionsQueryKey = ['oauth-connections', 'list'] as const

export const useOAuthConnectionsQuery = (): UseQueryResult<OAuthConnectionDto[], Error> =>
	useQuery({
		queryKey: oauthConnectionsQueryKey,
		queryFn: getOAuthConnections,
		select: response => response.data,
	})
