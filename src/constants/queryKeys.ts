export const queryKeys = {
	workflows: {
		all: () => ['workflows'] as const,
		list: (params?: { cursor?: string; size?: number }) => [...queryKeys.workflows.all(), 'list', params] as const,
	},
} as const
