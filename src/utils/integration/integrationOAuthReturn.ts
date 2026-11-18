import {
	INTEGRATION_OAUTH_PROVIDERS,
	OAUTH_ERROR_MESSAGES,
	OAUTH_FALLBACK_ERROR_MESSAGES,
	OAUTH_SUCCESS_MESSAGES,
	type IntegrationOAuthProvider,
} from '@/constants/integration/oauthReturnMessages'

const OAUTH_RETURN_QUERY_KEYS = [
	'connected',
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

// Slack은 콜백을 BE가 받은 뒤 `connected`·`error` 쿼리로 연동 화면에 돌려보낸다.
// 콜백 URL이 프론트로 잘못 오면 code를 API로 다시 보내야 하므로(nonce 검증) 이 패턴에 넣지 않는다.
const FRONTEND_OAUTH_CALLBACK_PATTERN = /^\/api\/v\d+\/(?:github|notion)\/oauth2\/callback\/?$/i

const toOAuthProvider = (value: string | null | undefined): IntegrationOAuthProvider | null => {
	const normalized = value?.toLowerCase()
	return INTEGRATION_OAUTH_PROVIDERS.find(provider => provider === normalized) ?? null
}

const getOAuthError = (searchParams: URLSearchParams): string | null =>
	searchParams.get('error') ?? searchParams.get('oauth_error')

const getOAuthSuccess = (searchParams: URLSearchParams): string | null =>
	searchParams.get('success') ?? searchParams.get('oauth_success') ?? searchParams.get('status')

const isOAuthFailure = (success: string | null): boolean => success === 'false' || success === '0'

// Google 계정 연동은 서버가 확인한 linked 값으로만 성공을 안내한다. 로그인 인가 code와 구분한다.
const isGoogleLinked = (searchParams: URLSearchParams): boolean => searchParams.get('linked') === 'google'

/** `slack_denied`처럼 공급자 접두어가 붙은 오류 코드에서 공급자를 꺼낸다. */
const getErrorCodeProvider = (error: string | null): IntegrationOAuthProvider | null => {
	if (!error) return null
	const separatorIndex = error.indexOf('_')
	return separatorIndex > 0 ? toOAuthProvider(error.slice(0, separatorIndex)) : null
}

export const isOAuthReturnSearchParams = (searchParams: URLSearchParams): boolean =>
	isGoogleLinked(searchParams) || OAUTH_RETURN_QUERY_KEYS.some(key => searchParams.has(key))

export const removeOAuthReturnSearchParams = (searchParams: URLSearchParams): URLSearchParams => {
	const nextSearchParams = new URLSearchParams(searchParams)
	if (isGoogleLinked(nextSearchParams)) nextSearchParams.delete('linked')
	OAUTH_RETURN_QUERY_KEYS.forEach(key => nextSearchParams.delete(key))
	return nextSearchParams
}

export const detectOAuthProvider = (pathname: string, searchParams: URLSearchParams): IntegrationOAuthProvider | null => {
	if (isGoogleLinked(searchParams)) return 'google'

	const providerParam =
		searchParams.get('connected') ??
		searchParams.get('provider') ??
		searchParams.get('integration') ??
		searchParams.get('service')
	const fromParam = toOAuthProvider(providerParam) ?? getErrorCodeProvider(getOAuthError(searchParams))
	if (fromParam) return fromParam

	const path = pathname.toLowerCase()
	return INTEGRATION_OAUTH_PROVIDERS.find(provider => path.includes(provider)) ?? null
}

export const isFrontendOAuthApiCallbackPath = (pathname: string): boolean => FRONTEND_OAUTH_CALLBACK_PATTERN.test(pathname)

const isOAuthSuccess = (searchParams: URLSearchParams, provider: IntegrationOAuthProvider): boolean => {
	if (provider === 'google') return isGoogleLinked(searchParams)
	if (searchParams.has('code')) return true
	if (searchParams.has('connected')) return true
	const success = getOAuthSuccess(searchParams)
	return success === 'true' || success === 'success' || success === '1' || success === 'ok'
}

export const buildInterSettingOAuthReturnUrl = (
	searchParams: URLSearchParams,
	provider: IntegrationOAuthProvider | null
): string => {
	const next = new URLSearchParams()

	const error = getOAuthError(searchParams)
	const connected = searchParams.get('connected')
	const success = getOAuthSuccess(searchParams)

	if (error) {
		next.set('error', error)
	} else if (provider === 'google') {
		if (isOAuthFailure(success)) next.set('success', 'false')
		else if (isGoogleLinked(searchParams)) next.set('linked', 'google')
	} else if (connected) {
		next.set('connected', connected)
	} else if (provider && isOAuthSuccess(searchParams, provider)) {
		next.set('success', 'true')
	} else if (success) {
		next.set('success', success)
	}

	if (provider === 'google' && next.size === 0) return '/inter-setting'

	const message = searchParams.get('message')
	if (message) next.set('message', message)

	if (provider) next.set('provider', provider)

	const query = next.toString()
	return query ? `/inter-setting?${query}` : '/inter-setting'
}

/** 오류 코드의 안내 문구. 매핑이 없으면 공급자 공통 문구, 그것도 없으면 코드를 그대로 쓴다. */
const getOAuthErrorMessage = (error: string): string => {
	const code = error.toLowerCase()
	// URL에서 온 값이라 `__proto__` 같은 상속 키가 객체·함수를 돌려주지 않게 자기 키만 조회한다.
	if (Object.hasOwn(OAUTH_ERROR_MESSAGES, code)) return OAUTH_ERROR_MESSAGES[code]
	const provider = getErrorCodeProvider(error)
	return (provider && OAUTH_FALLBACK_ERROR_MESSAGES[provider]) ?? error
}

export const getOAuthReturnMessage = (
	searchParams: URLSearchParams,
	provider: IntegrationOAuthProvider | null
): { title: string; message: string } | null => {
	const error = getOAuthError(searchParams)
	if (error) {
		return { title: '연동 실패', message: getOAuthErrorMessage(error) }
	}

	if (isOAuthFailure(getOAuthSuccess(searchParams))) {
		return {
			title: '연동 실패',
			message: searchParams.get('message') ?? '연동에 실패했습니다.',
		}
	}

	if (provider && isOAuthSuccess(searchParams, provider)) {
		return { title: '연동 완료', message: OAUTH_SUCCESS_MESSAGES[provider] }
	}

	return null
}
