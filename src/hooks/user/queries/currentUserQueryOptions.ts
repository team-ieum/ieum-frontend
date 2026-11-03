import { queryOptions } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/user'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const currentUserQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.users.me(),
		queryFn: getCurrentUser,
		select: response => response.data,
		staleTime: QUERY_STALE_TIME_MS.currentUser,
	})
