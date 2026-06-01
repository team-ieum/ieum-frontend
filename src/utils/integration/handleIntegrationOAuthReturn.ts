import type { QueryClient } from '@tanstack/react-query'
import { googleMyScopesQueryKey } from '@/hooks/googleOAuth/queries/useGoogleMyScopesQuery'
import { googleScopesQueryKey } from '@/hooks/googleOAuth/queries/useGoogleScopesQuery'

type OAuthReturnModal = (title: string, message: string) => void

export const invalidateIntegrationOAuthQueries = (queryClient: QueryClient) =>
	Promise.all([
		queryClient.invalidateQueries({ queryKey: googleMyScopesQueryKey }),
		queryClient.invalidateQueries({ queryKey: googleScopesQueryKey }),
	])

export const getIntegrationOAuthReturnMessage = (searchParams: URLSearchParams): { title: string; message: string } | null => {
	const error = searchParams.get('error') ?? searchParams.get('oauth_error')
	if (error) {
		return { title: '연동 실패', message: error }
	}

	const success = searchParams.get('success') ?? searchParams.get('oauth_success')
	if (success === 'false' || success === '0') {
		return {
			title: '연동 실패',
			message: searchParams.get('message') ?? '연동에 실패했습니다.',
		}
	}

	return null
}

export const handleIntegrationOAuthReturn = async (
	searchParams: URLSearchParams,
	queryClient: QueryClient,
	openModal: OAuthReturnModal
) => {
	await invalidateIntegrationOAuthQueries(queryClient)

	const modalMessage = getIntegrationOAuthReturnMessage(searchParams)
	if (modalMessage) openModal(modalMessage.title, modalMessage.message)
}
