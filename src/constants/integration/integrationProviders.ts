import type { IntegrationBrand } from '@/types/integration'
import type { WebhookCredentialProvider } from '@/types/webhookCredentials'

export const WEBHOOK_PROVIDER_BRAND: Record<WebhookCredentialProvider, IntegrationBrand> = {
	SLACK: 'slack',
	DISCORD: 'discord',
}

export const OAUTH_PROVIDER_BRAND: Record<string, IntegrationBrand> = {
	GOOGLE: 'google',
	GITHUB: 'github',
	NOTION: 'notion',
}

/** OAuth 연결 시 연결 가능 카탈로그에서 제외할 브랜드 */
export const OAUTH_PROVIDER_EXCLUDED_CATALOG_BRANDS: Record<string, IntegrationBrand[]> = {
	GOOGLE: ['google', 'gmail', 'sheets'],
	GITHUB: ['github'],
	NOTION: ['notion'],
}

export const OAUTH_AUTHORIZE_PATH_BY_SERVICE_ID = {
	github: '/api/v1/github/oauth2/authorize',
	notion: '/api/v1/notion/oauth2/authorize',
} as const

export type OAuthConnectServiceId = keyof typeof OAUTH_AUTHORIZE_PATH_BY_SERVICE_ID

export const isOAuthConnectServiceId = (serviceId: string): serviceId is OAuthConnectServiceId =>
	serviceId in OAUTH_AUTHORIZE_PATH_BY_SERVICE_ID
