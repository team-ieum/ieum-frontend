import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { buildInterSettingOAuthReturnUrl, detectOAuthProvider } from '@/utils/integration/integrationOAuthReturn'

const IntegrationOAuthCallbackPage = () => {
	const navigate = useNavigate()
	const location = useLocation()
	const [searchParams] = useSearchParams()

	useEffect(() => {
		const provider = detectOAuthProvider(location.pathname, searchParams)
		navigate(buildInterSettingOAuthReturnUrl(searchParams, provider), { replace: true })
	}, [location.pathname, navigate, searchParams])

	return (
		<div className='flex min-h-screen items-center justify-center bg-neutral-50'>
			<p className='m-0 typo-body2_regular text-neutral-600'>연동 처리 중...</p>
		</div>
	)
}

export default IntegrationOAuthCallbackPage
