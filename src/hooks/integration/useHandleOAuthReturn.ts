import { useCallback } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { oauthConnectionsQueryKey } from '@/constants/queryKeys'
import { detectOAuthProvider, getOAuthReturnMessage } from '@/utils/integration/integrationOAuthReturn'

type OAuthReturnModal = (title: string, message: string) => void

export const useHandleOAuthReturn = (queryClient: QueryClient, openModal: OAuthReturnModal) =>
	useCallback(
		async (searchParams: URLSearchParams, pathname = '') => {
			const provider = detectOAuthProvider(pathname, searchParams)
			await queryClient.invalidateQueries({ queryKey: oauthConnectionsQueryKey })

			const modalMessage = getOAuthReturnMessage(searchParams, provider)
			if (modalMessage) openModal(modalMessage.title, modalMessage.message)
		},
		[openModal, queryClient]
	)
