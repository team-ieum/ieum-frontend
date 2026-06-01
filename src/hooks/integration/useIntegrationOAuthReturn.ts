import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { useModalStore } from '@/stores/useModalStore'
import { useHandleOAuthReturn } from '@/hooks/integration/useHandleOAuthReturn'
import { isOAuthReturnSearchParams } from '@/utils/integration/integrationOAuthReturn'

export const useIntegrationOAuthReturn = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)
	const handleOAuthReturn = useHandleOAuthReturn(queryClient, openModal)

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
