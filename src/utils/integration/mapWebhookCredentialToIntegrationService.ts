import { WEBHOOK_PROVIDER_BRAND, WEBHOOK_PROVIDER_CATALOG_ID } from '@/constants/integration/integrationProviders'
import type { WebhookCredentialDto } from '@/types/webhookCredentials'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'
import { formatIntegrationLastSync } from '@/utils/integration/formatIntegrationLastSync'

const mapProviderToBrand = (provider: WebhookCredentialDto['provider']): IntegrationBrand =>
	WEBHOOK_PROVIDER_BRAND[provider] ?? 'webhook'

export const getExcludedCatalogIdsForWebhookCredentials = (credentials: WebhookCredentialDto[]): string[] => [
	...new Set(
		credentials.map(credential => WEBHOOK_PROVIDER_CATALOG_ID[credential.provider] ?? mapProviderToBrand(credential.provider))
	),
]

export const mapWebhookCredentialToIntegrationService = (credential: WebhookCredentialDto): IntegrationService => ({
	id: credential.id,
	name: credential.displayName,
	brand: mapProviderToBrand(credential.provider),
	status: credential.enabled ? 'connected' : 'error',
	origin: 'webhook',
	connectionMethod: 'webhook',
	account: credential.defaultChannel,
	lastSync: formatIntegrationLastSync(credential.createdAt),
})
