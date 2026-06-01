import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { WebhookCredentialDto } from '@/types/webhookCredentials'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'

const PROVIDER_BRAND_MAP: Record<WebhookCredentialDto['provider'], IntegrationBrand> = {
	SLACK: 'slack',
	DISCORD: 'discord',
}

const mapProviderToBrand = (provider: WebhookCredentialDto['provider']): IntegrationBrand =>
	PROVIDER_BRAND_MAP[provider] ?? 'webhook'

export const mapWebhookCredentialToIntegrationService = (credential: WebhookCredentialDto): IntegrationService => ({
	id: credential.id,
	name: credential.displayName,
	brand: mapProviderToBrand(credential.provider),
	status: credential.enabled ? 'connected' : 'error',
	account: credential.defaultChannel,
	lastSync: formatDistanceToNow(new Date(credential.createdAt), { addSuffix: true, locale: ko }),
	workflowCount: 0,
})
