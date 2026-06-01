import { useQuery } from '@tanstack/react-query'
import { getCredentials } from '@/api/credential'
import { queryKeys } from '@/constants/queryKeys'

export const useCredentialsQuery = () =>
	useQuery({
		queryKey: queryKeys.credentials.list(),
		queryFn: getCredentials,
	})
