import { useQuery } from '@tanstack/react-query'
import { getGoogleMyScopes } from '@/api/googleOAuth'

export const googleMyScopesQueryKey = ['google-oauth', 'my-scopes'] as const

export const useGoogleMyScopesQuery = () =>
	useQuery({
		queryKey: googleMyScopesQueryKey,
		queryFn: getGoogleMyScopes,
		select: response => response.data,
	})
