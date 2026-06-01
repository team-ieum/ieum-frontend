import {
	buildInterSettingOAuthReturnUrl,
	detectOAuthProvider,
	isFrontendOAuthApiCallbackPath,
} from '@/utils/integration/integrationOAuthReturn'
import { resolveOAuthRedirectUrl } from '@/utils/integration/resolveOAuthRedirectUrl'

/**
 * 브라우저가 프론트 origin에 /api/... 로 떨어졌을 때 처리.
 * GitHub 등은 백엔드 callback URL이 프론트로 잘못 오면 code가 API로 재전송되므로 inter-setting으로 보냄.
 */
export const resolveApiPathFromBrowserLocation = (): string | null => {
	const { pathname, search, hash } = window.location
	if (!pathname.startsWith('/api/')) return null

	if (isFrontendOAuthApiCallbackPath(pathname)) {
		const searchParams = new URLSearchParams(search)
		const provider = detectOAuthProvider(pathname, searchParams)
		return buildInterSettingOAuthReturnUrl(searchParams, provider)
	}

	return resolveOAuthRedirectUrl(`${pathname}${search}${hash}`)
}
