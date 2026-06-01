import { useQuery } from '@tanstack/react-query'
import { getGoogleScopes } from '@/api/googleOAuth'

export const googleScopesQueryKey = ['google-oauth', 'scopes'] as const

export const useGoogleScopesQuery = () =>
	useQuery({
		queryKey: googleScopesQueryKey,
		queryFn: getGoogleScopes,
		select: response => response.data,
	})
