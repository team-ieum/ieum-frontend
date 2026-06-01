import { getGithubOAuthAuthorizeUrl, getGoogleOAuthAuthorizeUrl, getNotionOAuthAuthorizeUrl } from '@/api/integrationOAuth'

const OAUTH_AUTHORIZE_BY_SERVICE_ID: Record<string, () => Promise<string>> = {
	github: getGithubOAuthAuthorizeUrl,
	notion: getNotionOAuthAuthorizeUrl,
}

/** 카탈로그 타일 id → Google scope group (API connect body) */
const CATALOG_GOOGLE_SCOPE_GROUP: Record<string, string> = {
	gmail: 'GMAIL',
	sheets: 'SHEETS',
	google: 'DRIVE',
}

const parseGoogleScopeGroupKey = (serviceId: string): string | null => {
	const fromCatalog = CATALOG_GOOGLE_SCOPE_GROUP[serviceId]
	if (fromCatalog) return fromCatalog

	if (!serviceId.startsWith('google-scope-')) return null
	return serviceId.slice('google-scope-'.length).toUpperCase()
}

/** 연결 가능 타일 id → OAuth 인가 URL. 미지원이면 null */
export const resolveIntegrationOAuthRedirect = async (serviceId: string): Promise<string | null> => {
	const authorize = OAUTH_AUTHORIZE_BY_SERVICE_ID[serviceId]
	if (authorize) return authorize()

	if (parseGoogleScopeGroupKey(serviceId)) return getGoogleOAuthAuthorizeUrl()

	return null
}
