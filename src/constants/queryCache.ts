export const QUERY_STALE_TIME_MS = {
	dashboardSummary: 30_000,
	dashboardExecutions: 10_000,
	dashboardErrors: 10_000,
	workflowList: 30_000,
	oauthConnections: 10_000,
	webhookCredentials: 10_000,
	providers: 5 * 60_000,
	credentials: 10_000,
} as const
