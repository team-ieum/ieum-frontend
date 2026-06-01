import { useEffect } from 'react'
import { resolveApiPathFromBrowserLocation } from '@/utils/integration/resolveOAuthRedirectUrl'

const ApiPathRedirectPage = () => {
	useEffect(() => {
		const target = resolveApiPathFromBrowserLocation()
		if (target) window.location.replace(target)
	}, [])

	return (
		<div className='flex min-h-screen items-center justify-center bg-neutral-50'>
			<p className='m-0 typo-body2_regular text-neutral-600'>API로 이동 중...</p>
		</div>
	)
}

export default ApiPathRedirectPage
