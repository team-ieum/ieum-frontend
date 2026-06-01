import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getOAuthConnections } from '@/api/oauthConnections'
import { oauthConnectionsQueryKey } from '@/constants/queryKeys'
import type { OAuthConnectionDto } from '@/types/oauthConnections'

export const useOAuthConnectionsQuery = (): UseQueryResult<OAuthConnectionDto[], Error> =>
	useQuery({
		queryKey: oauthConnectionsQueryKey,
		queryFn: getOAuthConnections,
		select: response => response.data,
	})
