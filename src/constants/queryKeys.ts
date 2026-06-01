export const queryKeys = {
	workflows: {
		all: () => ['workflows'] as const,
		list: (params?: { cursor?: string; size?: number }) => [...queryKeys.workflows.all(), 'list', params] as const,
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
} as const

export const oauthConnectionsQueryKey = queryKeys.oauthConnections.list()
