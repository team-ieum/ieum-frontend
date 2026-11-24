import type { IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'
import type { OAuthConnectionDto, OAuthConnectionsListResponse } from '@/types/oauthConnections'
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
			displayName: null,
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

export const slackOAuthConnection = {
	id: '77777777-7777-4777-8777-777777777777',
	provider: 'SLACK',
	providerAccountId: 'T0123456789',
	displayName: '이음 팀',
	scopes: ['chat:write', 'chat:write.public', 'channels:read'],
	createdAt: '2026-10-21T10:00:00Z',
} satisfies OAuthConnectionDto

/** 연결한 Discord 서버 하나. 서버마다 DISCORD 항목이 하나씩 온다(`providerAccountId` = 서버 ID). */
export const discordOAuthConnection = {
	id: '88888888-8888-4888-8888-888888888888',
	provider: 'DISCORD',
	providerAccountId: '1490935305161801760',
	displayName: 'Team IEUM',
	scopes: [],
	createdAt: '2026-10-24T13:15:02',
} satisfies OAuthConnectionDto

/** Google 연결을 쓰는 워크플로우 목록(`GET /api/v1/integrations/GOOGLE/workflows` 첫 페이지) */
export const googleIntegrationWorkflowsResponse = {
	success: true,
	data: {
		content: [
			{
				id: 'a1b2c3d4-0000-4000-8000-000000000001',
				name: '주간 회의 일정 등록',
				description: '매주 월요일 회의를 Google Calendar에 만든다',
				active: true,
				triggerType: 'SCHEDULE',
				usedNodeCount: 1,
				updatedAt: '2026-11-14T09:00:00Z',
			},
			{
				id: 'a1b2c3d4-0000-4000-8000-000000000002',
				name: '마감 일정 정리',
				description: '',
				active: false,
				triggerType: 'MANUAL',
				usedNodeCount: 2,
				updatedAt: '2026-11-10T09:00:00Z',
			},
		],
		size: 20,
		hasNext: false,
		nextCursor: null,
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies IntegrationServiceWorkflowsResponse
