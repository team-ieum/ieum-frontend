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
	users: {
		all: () => ['users'] as const,
		me: () => [...queryKeys.users.all(), 'me'] as const,
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
	nodeTestSamples: {
		all: () => ['node-test-samples'] as const,
		/** `workflows.detail` 무효화에 휩쓸리지 않도록 워크플로우 키 밖에 둔다. */
		detail: (workflowId: string, nodeId: string) => [...queryKeys.nodeTestSamples.all(), workflowId, nodeId] as const,
	},
	webhookTokens: {
		all: () => ['webhook-tokens'] as const,
		status: (workflowId: string) => [...queryKeys.webhookTokens.all(), workflowId, 'status'] as const,
		/** 발급 응답의 평문 주소. 서버에서 다시 받을 수 없어 발급 mutation이 넣은 값만 들어 있다. */
		address: (workflowId: string) => [...queryKeys.webhookTokens.all(), workflowId, 'address'] as const,
	},
	workflowValidations: {
		all: () => ['workflow-validations'] as const,
		/** 생성·삭제 때의 `workflows.all()` 무효화가 검사 POST를 다시 보내지 않도록 워크플로우 키 밖에 둔다. */
		detail: (workflowId: string) => [...queryKeys.workflowValidations.all(), workflowId] as const,
	},
	nodeOptions: {
		all: () => ['node-options'] as const,
		list: (source: string, inputs: Record<string, string>) => [...queryKeys.nodeOptions.all(), source, inputs] as const,
	},
	integrations: {
		all: () => ['integrations'] as const,
		workflows: (serviceType: IntegrationServiceType | 'UNKNOWN', params?: { size?: number }) =>
			[...queryKeys.integrations.all(), 'workflows', serviceType, params] as const,
	},
} as const
