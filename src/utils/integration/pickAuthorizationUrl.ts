const AUTHORIZE_URL_KEYS = [
	'authorizationUrl',
	'authorization_url',
	'authorizeUrl',
	'authorize_url',
	'url',
	'redirectUrl',
] as const

export const pickAuthorizationUrl = (data: Record<string, string> | string): string => {
	if (typeof data === 'string') {
		if (data.length > 0) return data
		throw new Error('인가 URL을 받지 못했습니다.')
	}

	for (const key of AUTHORIZE_URL_KEYS) {
		const value = data[key]
		if (value) return value
	}

	const firstAbsoluteUrl = Object.values(data).find(value => /^https?:\/\//i.test(value))
	if (firstAbsoluteUrl) return firstAbsoluteUrl

	const firstApiPath = Object.values(data).find(value => value.startsWith('/api/'))
	if (firstApiPath) return firstApiPath

	const firstNonEmpty = Object.values(data).find(value => value.length > 0)
	if (firstNonEmpty) return firstNonEmpty

	throw new Error('인가 URL을 받지 못했습니다.')
}
