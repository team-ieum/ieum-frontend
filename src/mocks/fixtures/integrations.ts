import type { OAuthConnectionsListResponse } from '@/types/oauthConnections'
import type { WebhookCredentialsListResponse } from '@/types/webhookCredentials'

export const webhookCredentialsResponse = {
	success: true,
	data: [
		{
			id: '55555555-5555-4555-8555-555555555555',
			provider: 'SLACK',
			displayName: '팀 Slack',
			defaultChannel: '#automation',
			enabled: true,
			createdAt: '2026-08-25T04:00:00Z',
		},
	],
	message: 'success',
	code: 'SUCCESS',
} satisfies WebhookCredentialsListResponse

export const emptyWebhookCredentialsResponse = {
	...webhookCredentialsResponse,
	data: [],
} satisfies WebhookCredentialsListResponse

export const oauthConnectionsResponse = {
	success: true,
	data: [
		{
			id: '66666666-6666-4666-8666-666666666666',
			provider: 'GOOGLE',
			providerAccountId: 'tester@example.com',
			scopes: ['https://www.googleapis.com/auth/drive.file'],
			createdAt: '2026-08-24T03:00:00Z',
		},
	],
	message: 'success',
	code: 'SUCCESS',
} satisfies OAuthConnectionsListResponse

export const emptyOAuthConnectionsResponse = {
	...oauthConnectionsResponse,
	data: [],
} satisfies OAuthConnectionsListResponse
