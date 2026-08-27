import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import {
	credentialsResponse,
	emptyCredentialsResponse,
	emptyProvidersResponse,
	providersResponse,
} from '@/mocks/fixtures/aiCredentials'
import {
	dashboardErrorsResponse,
	dashboardExecutionsResponse,
	dashboardSummaryResponse,
	emptyDashboardErrorsResponse,
	emptyDashboardExecutionsResponse,
	emptyDashboardSummaryResponse,
} from '@/mocks/fixtures/dashboard'
import {
	emptyOAuthConnectionsResponse,
	emptyWebhookCredentialsResponse,
	oauthConnectionsResponse,
	webhookCredentialsResponse,
} from '@/mocks/fixtures/integrations'
import {
	emptyWorkflowDetailResponse,
	emptyWorkflowListResponse,
	workflowDetailResponse,
	workflowListResponse,
} from '@/mocks/fixtures/workflows'

export type ApiMockResource =
	| 'workflowList'
	| 'workflowDetail'
	| 'dashboardSummary'
	| 'dashboardExecutions'
	| 'dashboardErrors'
	| 'webhookCredentials'
	| 'oauthConnections'
	| 'providers'
	| 'credentials'

type EndpointDefinition = {
	resource: ApiMockResource
	path: string
	matchesPath?: (pathname: string) => boolean
	successBody: Record<string, unknown>
	emptyBody: Record<string, unknown>
}

const endpointDefinitions: EndpointDefinition[] = [
	{
		resource: 'workflowList',
		path: '/api/v1/workflows',
		successBody: workflowListResponse,
		emptyBody: emptyWorkflowListResponse,
	},
	{
		resource: 'workflowDetail',
		path: '/api/v1/workflows/:workflowId',
		matchesPath: pathname => /^\/api\/v1\/workflows\/[^/]+$/.test(pathname),
		successBody: workflowDetailResponse,
		emptyBody: emptyWorkflowDetailResponse,
	},
	{
		resource: 'dashboardSummary',
		path: '/api/v1/workflows/dashboard/summary',
		successBody: dashboardSummaryResponse,
		emptyBody: emptyDashboardSummaryResponse,
	},
	{
		resource: 'dashboardExecutions',
		path: '/api/v1/workflows/dashboard/executions',
		successBody: dashboardExecutionsResponse,
		emptyBody: emptyDashboardExecutionsResponse,
	},
	{
		resource: 'dashboardErrors',
		path: '/api/v1/workflows/dashboard/errors',
		successBody: dashboardErrorsResponse,
		emptyBody: emptyDashboardErrorsResponse,
	},
	{
		resource: 'webhookCredentials',
		path: '/api/v1/webhook-credentials',
		successBody: webhookCredentialsResponse,
		emptyBody: emptyWebhookCredentialsResponse,
	},
	{
		resource: 'oauthConnections',
		path: '/api/v1/oauth/connections',
		successBody: oauthConnectionsResponse,
		emptyBody: emptyOAuthConnectionsResponse,
	},
	{
		resource: 'providers',
		path: '/api/v1/providers',
		successBody: providersResponse,
		emptyBody: emptyProvidersResponse,
	},
	{
		resource: 'credentials',
		path: '/api/v1/credentials',
		successBody: credentialsResponse,
		emptyBody: emptyCredentialsResponse,
	},
]

const createHandler = (
	definition: EndpointDefinition,
	options: { delayMs?: number; empty?: boolean; failure?: boolean; exposeTiming?: boolean } = {}
) =>
	http.get(`*${definition.path}`, async () => {
		if (options.delayMs) await delay(options.delayMs)
		if (options.failure) return new HttpResponse(null, { status: 500 })
		return HttpResponse.json(options.empty ? definition.emptyBody : definition.successBody, {
			headers: options.exposeTiming ? { 'Timing-Allow-Origin': '*' } : undefined,
		})
	})

export const createSuccessHandlers = (): HttpHandler[] => endpointDefinitions.map(definition => createHandler(definition))

export const createDelayedSuccessHandlers = (delayMs: number): HttpHandler[] =>
	endpointDefinitions.map(definition => createHandler(definition, { delayMs, exposeTiming: true }))

export const createEmptyHandlers = (): HttpHandler[] =>
	endpointDefinitions.map(definition => createHandler(definition, { empty: true }))

export const createAllFailureHandlers = (): HttpHandler[] =>
	endpointDefinitions.map(definition => createHandler(definition, { failure: true }))

export const createPartialFailureHandlers = (resources: ApiMockResource[]): HttpHandler[] => {
	const failures = new Set(resources)
	return endpointDefinitions
		.filter(definition => failures.has(definition.resource))
		.map(definition => createHandler(definition, { failure: true }))
}

export const isApiScenarioTargetRequest = (request: Request): boolean => {
	if (request.method !== 'GET') return false
	const requestPathname = new URL(request.url).pathname
	const pathname = requestPathname.length > 1 ? requestPathname.replace(/\/+$/, '') : requestPathname
	return endpointDefinitions.some(definition => definition.matchesPath?.(pathname) ?? definition.path === pathname)
}
