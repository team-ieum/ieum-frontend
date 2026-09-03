import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { queryKeys } from '@/constants/queryKeys'
import { useModalStore } from '@/stores/useModalStore'
import {
	detectOAuthProvider,
	getOAuthReturnMessage,
	isOAuthReturnSearchParams,
	removeOAuthReturnSearchParams,
} from '@/utils/integration/integrationOAuthReturn'

export const useIntegrationOAuthReturn = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)

	const handleOAuthReturn = useCallback(
		async (params: URLSearchParams, pathname = '') => {
			const provider = detectOAuthProvider(pathname, params)
			await queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list() })

			const modalMessage = getOAuthReturnMessage(params, provider)
			if (modalMessage) openModal(modalMessage.title, modalMessage.message)
		},
		[openModal, queryClient]
	)

	useEffect(() => {
		if (!isOAuthReturnSearchParams(searchParams)) return

		const oauthReturnSearchParams = new URLSearchParams(searchParams)
		setSearchParams(current => removeOAuthReturnSearchParams(current), { replace: true })
		void handleOAuthReturn(oauthReturnSearchParams).catch(() => undefined)
	}, [handleOAuthReturn, searchParams, setSearchParams])
}
