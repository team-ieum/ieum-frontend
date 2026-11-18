import { GOOGLE_OAUTH_TILES } from '@/constants/integration/googleOAuth'
import { INTEGRATION_BRAND_CONFIG } from '@/constants/integration/brandConfig'
import {
	OAUTH_BOT_PROVIDERS,
	OAUTH_PROVIDER_BRAND,
	OAUTH_PROVIDER_EXCLUDED_CATALOG_IDS,
} from '@/constants/integration/integrationProviders'
import type { OAuthConnectionDto } from '@/types/oauthConnections'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'
import { formatIntegrationLastSync } from '@/utils/integration/formatIntegrationLastSync'

const mapProviderToBrand = (provider: OAuthConnectionDto['provider']): IntegrationBrand =>
	OAUTH_PROVIDER_BRAND[provider.toUpperCase()] ?? 'webhook'

export const getExcludedCatalogIdsForOAuthConnections = (connections: OAuthConnectionDto[]): string[] => {
	const ids = new Set<string>()
	for (const connection of connections) {
		const provider = connection.provider.toUpperCase()
		// Google 로그인만으로도 기본 연결이 생긴다. 권한을 모두 받은 서비스만 연결 가능 목록에서 제외한다.
		if (provider === 'GOOGLE') {
			for (const [tileId, { requiredScopes }] of Object.entries(GOOGLE_OAUTH_TILES)) {
				if (requiredScopes.every(scope => connection.scopes.includes(scope))) ids.add(tileId)
			}
			continue
		}
		const excluded = OAUTH_PROVIDER_EXCLUDED_CATALOG_IDS[provider]
		// 설정에 없는 공급자는 카탈로그 id가 브랜드와 같다고 보고 제외한다.
		if (excluded) excluded.forEach(id => ids.add(id))
		else ids.add(mapProviderToBrand(connection.provider))
	}
	return [...ids]
}

export const mapOAuthConnectionToIntegrationService = (connection: OAuthConnectionDto): IntegrationService => {
	const brand = mapProviderToBrand(connection.provider)
	const provider = connection.provider.toUpperCase()

	return {
		id: `oauth-${connection.id}`,
		name: INTEGRATION_BRAND_CONFIG[brand].label,
		brand,
		status: 'connected',
		origin: 'oauth',
		connectionMethod: OAUTH_BOT_PROVIDERS.includes(provider) ? 'bot' : undefined,
		oauthProvider: provider,
		account: connection.displayName ?? connection.providerAccountId,
		lastSync: formatIntegrationLastSync(connection.createdAt),
		scopes: connection.scopes,
	}
}
