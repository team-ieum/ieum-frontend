import { queryOptions } from '@tanstack/react-query'
import { getCredentials, getProviders } from '@/api/credential'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const providersQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.providers.list(),
		queryFn: getProviders,
		staleTime: QUERY_STALE_TIME_MS.providers,
	})

export const credentialsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.credentials.list(),
		queryFn: getCredentials,
		staleTime: QUERY_STALE_TIME_MS.credentials,
	})
