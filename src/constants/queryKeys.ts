import type { IntegrationServiceType } from '@/types/integrationWorkflows'

export const queryKeys = {
	workflows: {
		all: () => ['workflows'] as const,
		/** params와 무관하게 모든 목록 query를 prefix로 무효화할 때 쓴다. */
		lists: () => [...queryKeys.workflows.all(), 'list'] as const,
		list: (params?: { cursor?: string; size?: number }) => [...queryKeys.workflows.lists(), params] as const,
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
	nodeCatalog: {
		all: () => ['node-catalog'] as const,
	},
	integrations: {
		all: () => ['integrations'] as const,
		workflows: (serviceType: IntegrationServiceType | 'UNKNOWN', params?: { size?: number }) =>
			[...queryKeys.integrations.all(), 'workflows', serviceType, params] as const,
	},
} as const
