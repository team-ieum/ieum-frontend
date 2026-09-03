export type IntegrationOAuthProvider = 'github' | 'notion'

const OAUTH_RETURN_QUERY_KEYS = [
	'error',
	'oauth_error',
	'success',
	'oauth_success',
	'oauth',
	'status',
	'provider',
	'integration',
	'service',
	'message',
] as const

const FRONTEND_OAUTH_CALLBACK_PATTERN = /^\/api\/v\d+\/(?:github|notion)\/oauth2\/callback\/?$/i

const OAUTH_SUCCESS_MESSAGES: Record<IntegrationOAuthProvider, string> = {
	github: 'GitHub 계정이 연결되었습니다.',
	notion: 'Notion 계정이 연결되었습니다.',
}

export const isOAuthReturnSearchParams = (searchParams: URLSearchParams): boolean =>
	OAUTH_RETURN_QUERY_KEYS.some(key => searchParams.has(key))

export const removeOAuthReturnSearchParams = (searchParams: URLSearchParams): URLSearchParams => {
	const nextSearchParams = new URLSearchParams(searchParams)
	OAUTH_RETURN_QUERY_KEYS.forEach(key => nextSearchParams.delete(key))
	return nextSearchParams
}

export const detectOAuthProvider = (pathname: string, searchParams: URLSearchParams): IntegrationOAuthProvider | null => {
	const providerParam = (
		searchParams.get('provider') ??
		searchParams.get('integration') ??
		searchParams.get('service')
	)?.toLowerCase()

	if (providerParam === 'github') return 'github'
	if (providerParam === 'notion') return 'notion'

	const path = pathname.toLowerCase()
	if (path.includes('github')) return 'github'
	if (path.includes('notion')) return 'notion'

	return null
}

export const isFrontendOAuthApiCallbackPath = (pathname: string): boolean => FRONTEND_OAUTH_CALLBACK_PATTERN.test(pathname)

export const isOAuthSuccess = (searchParams: URLSearchParams): boolean => {
	const success = searchParams.get('success') ?? searchParams.get('oauth_success') ?? searchParams.get('status')
	return success === 'true' || success === 'success' || success === '1' || success === 'ok'
}

export const buildInterSettingOAuthReturnUrl = (
	searchParams: URLSearchParams,
	provider: IntegrationOAuthProvider | null
): string => {
	const next = new URLSearchParams()

	const error = searchParams.get('error') ?? searchParams.get('oauth_error')
	const hasOAuthCode = searchParams.has('code')

	if (error) {
		next.set('error', error)
	} else if (isOAuthSuccess(searchParams) || hasOAuthCode) {
		next.set('success', 'true')
	} else {
		const success = searchParams.get('success') ?? searchParams.get('oauth_success') ?? searchParams.get('status')
		if (success) next.set('success', success)
	}

	const message = searchParams.get('message')
	if (message) next.set('message', message)

	if (provider) next.set('provider', provider)

	const query = next.toString()
	return query ? `/inter-setting?${query}` : '/inter-setting'
}

export const getOAuthReturnMessage = (
	searchParams: URLSearchParams,
	provider: IntegrationOAuthProvider | null
): { title: string; message: string } | null => {
	const error = searchParams.get('error') ?? searchParams.get('oauth_error')
	if (error) {
		return { title: '연동 실패', message: error }
	}

	const success = searchParams.get('success') ?? searchParams.get('oauth_success') ?? searchParams.get('status')
	if (success === 'false' || success === '0') {
		return {
			title: '연동 실패',
			message: searchParams.get('message') ?? '연동에 실패했습니다.',
		}
	}

	const hasOAuthCode = searchParams.has('code')
	if ((isOAuthSuccess(searchParams) || (hasOAuthCode && provider)) && provider) {
		return { title: '연동 완료', message: OAUTH_SUCCESS_MESSAGES[provider] }
	}

	return null
}
