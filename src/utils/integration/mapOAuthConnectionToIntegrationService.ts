import { INTEGRATION_BRAND_CONFIG } from '@/constants/integration/brandConfig'
import { OAUTH_PROVIDER_BRAND, OAUTH_PROVIDER_EXCLUDED_CATALOG_BRANDS } from '@/constants/integration/integrationProviders'
import type { OAuthConnectionDto } from '@/types/oauthConnections'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'
import { formatIntegrationLastSync } from '@/utils/integration/formatIntegrationLastSync'

const mapProviderToBrand = (provider: OAuthConnectionDto['provider']): IntegrationBrand =>
	OAUTH_PROVIDER_BRAND[provider.toUpperCase()] ?? 'webhook'

export const getExcludedCatalogBrandsForOAuthConnections = (connections: OAuthConnectionDto[]): IntegrationBrand[] => {
	const brands = new Set<IntegrationBrand>()
	for (const connection of connections) {
		const excluded = OAUTH_PROVIDER_EXCLUDED_CATALOG_BRANDS[connection.provider.toUpperCase()]
		if (excluded) excluded.forEach(brand => brands.add(brand))
		else brands.add(mapProviderToBrand(connection.provider))
	}
	return [...brands]
}

export const mapOAuthConnectionToIntegrationService = (connection: OAuthConnectionDto): IntegrationService => {
	const brand = mapProviderToBrand(connection.provider)

	return {
		id: `oauth-${connection.id}`,
		name: INTEGRATION_BRAND_CONFIG[brand].label,
		brand,
		status: 'connected',
		origin: 'oauth',
		account: connection.providerAccountId,
		lastSync: formatIntegrationLastSync(connection.createdAt),
		scopes: connection.scopes,
	}
}
