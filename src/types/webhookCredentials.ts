import type { ApiResponse } from '@/types/api'

export type WebhookCredentialProvider = 'SLACK' | 'DISCORD'

export interface WebhookCredentialDto {
	id: string
	provider: WebhookCredentialProvider
	displayName: string
	defaultChannel?: string
	enabled: boolean
	createdAt: string
}

export type WebhookCredentialsListResponse = ApiResponse<WebhookCredentialDto[]>

export type CreateWebhookCredentialRequest = {
	provider: WebhookCredentialProvider
	displayName: string
	webhookUrl: string
	defaultChannel?: string
}

export type CreateWebhookCredentialResponse = ApiResponse<WebhookCredentialDto>
