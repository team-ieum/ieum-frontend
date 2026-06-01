import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useModalStore } from '@/stores/useModalStore'
import { handleIntegrationOAuthReturn } from '@/utils/integration/handleIntegrationOAuthReturn'

const IntegrationOAuthCallbackPage = () => {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)

	useEffect(() => {
		void (async () => {
			await handleIntegrationOAuthReturn(searchParams, queryClient, openModal)
			navigate('/inter-setting', { replace: true })
		})()
	}, [navigate, openModal, queryClient, searchParams])

	return (
		<div className='flex min-h-screen items-center justify-center bg-neutral-50'>
			<p className='m-0 typo-body2_regular text-neutral-600'>연동 처리 중...</p>
		</div>
	)
}

export default IntegrationOAuthCallbackPage
