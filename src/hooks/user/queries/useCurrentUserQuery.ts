import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { currentUserQueryOptions } from '@/hooks/user/queries/currentUserQueryOptions'
import type { CurrentUser } from '@/types/user'

export const useCurrentUserQuery = (): UseQueryResult<CurrentUser, Error> => useQuery(currentUserQueryOptions())
