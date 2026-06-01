import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { oauthConnectionsQueryKey } from '@/constants/queryKeys'
import { useModalStore } from '@/stores/useModalStore'
import { detectOAuthProvider, getOAuthReturnMessage, isOAuthReturnSearchParams } from '@/utils/integration/integrationOAuthReturn'

export const useIntegrationOAuthReturn = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)

	const handleOAuthReturn = useCallback(
		async (params: URLSearchParams, pathname = '') => {
			const provider = detectOAuthProvider(pathname, params)
			await queryClient.invalidateQueries({ queryKey: oauthConnectionsQueryKey })

			const modalMessage = getOAuthReturnMessage(params, provider)
			if (modalMessage) openModal(modalMessage.title, modalMessage.message)
		},
		[openModal, queryClient]
	)

	useEffect(() => {
		if (!isOAuthReturnSearchParams(searchParams)) return

		void (async () => {
			try {
				await handleOAuthReturn(searchParams)
			} catch {
				// Modal / cache invalidation failures must not leave OAuth query params in the URL.
			} finally {
				setSearchParams({}, { replace: true })
			}
		})()
	}, [handleOAuthReturn, searchParams, setSearchParams])
}
