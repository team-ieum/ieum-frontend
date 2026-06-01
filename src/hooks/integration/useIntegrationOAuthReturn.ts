import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { useModalStore } from '@/stores/useModalStore'
import { handleIntegrationOAuthReturn, isOAuthReturnSearchParams } from '@/utils/integration/integrationOAuthReturn'

export const useIntegrationOAuthReturn = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)

	useEffect(() => {
		if (!isOAuthReturnSearchParams(searchParams)) return

		void (async () => {
			await handleIntegrationOAuthReturn(searchParams, queryClient, openModal)
			setSearchParams({}, { replace: true })
		})()
	}, [openModal, queryClient, searchParams, setSearchParams])
}
