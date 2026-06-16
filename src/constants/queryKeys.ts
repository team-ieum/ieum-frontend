import type { IntegrationServiceType } from '@/types/integrationWorkflows'

export const queryKeys = {
	workflows: {
		all: () => ['workflows'] as const,
		list: (params?: { cursor?: string; size?: number }) => [...queryKeys.workflows.all(), 'list', params] as const,
		dashboardSummary: () => [...queryKeys.workflows.all(), 'dashboard', 'summary'] as const,
		dashboardExecutions: (size: number) => [...queryKeys.workflows.all(), 'dashboard', 'executions', { size }] as const,
		dashboardErrors: (size: number) => [...queryKeys.workflows.all(), 'dashboard', 'errors', { size }] as const,
		detail: (id: string) => [...queryKeys.workflows.all(), 'detail', id] as const,
	},
	credentials: {
		all: () => ['credentials'] as const,
		list: () => [...queryKeys.credentials.all(), 'list'] as const,
	},
	providers: {
		all: () => ['providers'] as const,
		list: () => [...queryKeys.providers.all(), 'list'] as const,
	},
	oauthConnections: {
		all: () => ['oauth-connections'] as const,
		list: () => [...queryKeys.oauthConnections.all(), 'list'] as const,
	},
	webhookCredentials: {
		all: () => ['webhook-credentials'] as const,
		list: () => [...queryKeys.webhookCredentials.all(), 'list'] as const,
	},
	integrations: {
		all: () => ['integrations'] as const,
		workflows: (serviceType: IntegrationServiceType, params?: { size?: number }) =>
			[...queryKeys.integrations.all(), 'workflows', serviceType, params] as const,
	},
} as const

export const oauthConnectionsQueryKey = queryKeys.oauthConnections.list()
export const webhookCredentialsQueryKey = queryKeys.webhookCredentials.list()
