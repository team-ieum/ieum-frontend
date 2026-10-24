import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { ApiErrorCode } from '@/types/api'
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

const getEndpointDefinition = (resource: ApiMockResource): EndpointDefinition => {
	const definition = endpointDefinitions.find(candidate => candidate.resource === resource)
	if (!definition) {
		throw new Error(`Unknown API mock resource: ${resource}`)
	}
	return definition
}

const createHandler = (
	definition: EndpointDefinition,
	options: {
		delayMs?: number
		empty?: boolean
		failure?: boolean
		exposeTiming?: boolean
		holdUntil?: Promise<void>
		onRequest?: (resource: ApiMockResource) => void
	} = {}
) =>
	http.get(`*${definition.path}`, async () => {
		options.onRequest?.(definition.resource)
		if (options.holdUntil) await options.holdUntil
		if (options.delayMs) await delay(options.delayMs)
		if (options.failure) return new HttpResponse(null, { status: 500 })
		return HttpResponse.json(options.empty ? definition.emptyBody : definition.successBody, {
			headers: options.exposeTiming ? { 'Timing-Allow-Origin': '*' } : undefined,
		})
	})

export const createSuccessHandlers = (): HttpHandler[] => endpointDefinitions.map(definition => createHandler(definition))

export const createDelayedSuccessHandlers = (delayMs: number): HttpHandler[] =>
	endpointDefinitions.map(definition => createHandler(definition, { delayMs, exposeTiming: true }))

export const createObservedSuccessHandlers = (onRequest: (resource: ApiMockResource) => void, delayMs?: number): HttpHandler[] =>
	endpointDefinitions.map(definition => createHandler(definition, { delayMs, onRequest }))

/**
 * 모든 endpoint의 성공 응답을 `release` 호출 전까지 보류하는 handler를 만든다.
 * background refetch 진행 중처럼 응답 전 상태를 응답 시점과 무관하게 확인할 때 쓴다.
 * 보류된 요청은 `release` 전까지 끝나지 않으므로, 확인을 마치면 `release`한 뒤 완료를 기다린다. 이후 요청은 바로 응답한다.
 */
export const createHeldSuccessHandlers = (onRequest?: (resource: ApiMockResource) => void) => {
	let release!: () => void
	const released = new Promise<void>(resolve => {
		release = resolve
	})
	return {
		handlers: endpointDefinitions.map(definition => createHandler(definition, { holdUntil: released, onRequest })),
		release,
	}
}

export const createObservedFailureHandlers = (
	resources: ApiMockResource[],
	onRequest: (resource: ApiMockResource) => void
): HttpHandler[] => {
	const failures = new Set(resources)
	return endpointDefinitions
		.filter(definition => failures.has(definition.resource))
		.map(definition => createHandler(definition, { failure: true, onRequest }))
}

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

export const createResourceSuccessHandler = (resource: ApiMockResource, delayMs?: number): HttpHandler =>
	createHandler(getEndpointDefinition(resource), { delayMs })

/**
 * `release`가 resolve될 때까지 resource 요청을 붙잡은 뒤 다음 handler로 넘긴다.
 * 응답을 만들지 않으므로 응답을 줄 handler(예: `createObservedSuccessHandlers`)를 먼저 등록하고 이 handler를 나중에 `server.use`해야 한다.
 */
export const createResourceHoldHandler = (
	resource: ApiMockResource,
	release: Promise<void>,
	onHold?: (resource: ApiMockResource) => void
): HttpHandler =>
	http.get(`*${getEndpointDefinition(resource).path}`, async () => {
		onHold?.(resource)
		await release
	})

export const createResourceEmptyHandler = (resource: ApiMockResource): HttpHandler =>
	createHandler(getEndpointDefinition(resource), { empty: true })

export const createResourceApiErrorHandler = (resource: ApiMockResource, code: ApiErrorCode, status = 404): HttpHandler => {
	const definition = getEndpointDefinition(resource)

	return http.get(`*${definition.path}`, () =>
		HttpResponse.json(
			{
				success: false,
				data: null,
				message: '요청한 리소스를 찾을 수 없습니다.',
				code,
			},
			{ status }
		)
	)
}

export const isApiScenarioTargetRequest = (request: Request): boolean => {
	if (request.method !== 'GET') return false
	const requestPathname = new URL(request.url).pathname
	const pathname = requestPathname.length > 1 ? requestPathname.replace(/\/+$/, '') : requestPathname
	return endpointDefinitions.some(definition => definition.matchesPath?.(pathname) ?? definition.path === pathname)
}
