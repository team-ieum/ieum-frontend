import { useQuery } from '@tanstack/react-query'
import { getOAuthConnections } from '@/api/oauthConnections'

export const oauthConnectionsQueryKey = ['oauth-connections', 'list'] as const

export const useOAuthConnectionsQuery = () =>
	useQuery({
		queryKey: oauthConnectionsQueryKey,
		queryFn: getOAuthConnections,
		select: response => response.data,
	})
