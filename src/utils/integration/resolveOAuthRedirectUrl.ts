const getApiBaseUrl = (): string => {
	const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
	if (!apiBase) {
		throw new Error('VITE_API_URL이 설정되지 않았습니다.')
	}
	return apiBase
}

const getApiOrigin = (): string => new URL(`${getApiBaseUrl()}/`).origin

const toApiAbsoluteUrl = (pathname: string, search: string, hash: string): string =>
	`${getApiBaseUrl()}${pathname}${search}${hash}`

/** API 경로(/api/...)는 항상 VITE_API_URL 호스트로 보냄 (백엔드가 localhost URL을 줄 때 포함) */
export const resolveOAuthRedirectUrl = (url: string): string => {
	const trimmed = url.trim()
	const apiBase = getApiBaseUrl()
	const apiOrigin = getApiOrigin()

	try {
		const resolved = /^https?:\/\//i.test(trimmed)
			? new URL(trimmed)
			: new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, `${apiBase}/`)

		if (resolved.pathname.startsWith('/api/') && resolved.origin !== apiOrigin) {
			return toApiAbsoluteUrl(resolved.pathname, resolved.search, resolved.hash)
		}

		if (!/^https?:\/\//i.test(trimmed)) {
			return toApiAbsoluteUrl(resolved.pathname, resolved.search, resolved.hash)
		}

		return resolved.href
	} catch {
		return trimmed
	}
}

/** 주소창이 localhost인데 /api/... 인 경우 (OAuth 잘못된 리다이렉트 폴백) */
export const resolveApiPathFromBrowserLocation = (): string | null => {
	const { pathname, search, hash } = window.location
	if (!pathname.startsWith('/api/')) return null
	return resolveOAuthRedirectUrl(`${pathname}${search}${hash}`)
}
