import { useQuery } from '@tanstack/react-query'
import { getProviders } from '@/api/credential'
import { queryKeys } from '@/constants/queryKeys'

export const useProvidersQuery = () =>
	useQuery({
		queryKey: queryKeys.providers.list(),
		queryFn: getProviders,
		staleTime: 5 * 60 * 1000,
	})
