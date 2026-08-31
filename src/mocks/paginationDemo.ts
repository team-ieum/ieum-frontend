import { delay, http, HttpResponse, type HttpHandler, type UnhandledRequestCallback } from 'msw'
import type { WorkflowDto, WorkflowListResponse } from '@/types/workflowList'

export const PAGINATION_DEMO_WORKFLOW_COUNT = 60
export const PAGINATION_DEMO_PAGE_SIZE = 20
export const PAGINATION_DEMO_REQUEST_DELAY_MS = 700

const serviceBrands = ['slack', 'notion', 'github', 'gmail', 'sheets', 'discord'] as const
const triggerTypes = ['MANUAL', 'SCHEDULE', 'WEBHOOK'] as const

export const paginationDemoWorkflows: WorkflowDto[] = Array.from({ length: PAGINATION_DEMO_WORKFLOW_COUNT }, (_, index) => {
	const sequence = index + 1
	const sequenceLabel = String(sequence).padStart(2, '0')
	const triggerType = triggerTypes[index % triggerTypes.length]
	const serviceBrand = serviceBrands[index % serviceBrands.length]
	const triggerNodeId = `trigger-${sequenceLabel}`
	const serviceNodeId = `service-${sequenceLabel}`

	return {
		id: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
		userId: '99999999-9999-4999-8999-999999999999',
		name: `페이지네이션 데모 ${sequenceLabel}`,
		description: `${serviceBrand} 연동을 확인하는 ${sequenceLabel}번째 워크플로우입니다.`,
		active: sequence % 5 !== 0,
		triggerType,
		cronExpression: triggerType === 'SCHEDULE' ? `0 ${index % 60} 9 * * ?` : null,
		version: 1,
		nodes: [
			{
				id: triggerNodeId,
				type: 'TRIGGER',
				label: '시작',
				position: { x: 80, y: 120 },
				config: {},
			},
			{
				id: serviceNodeId,
				type: 'HTTP',
				label: `${serviceBrand} 작업`,
				position: { x: 400, y: 120 },
				config: { brand: serviceBrand },
			},
		],
		edges: [{ source: triggerNodeId, target: serviceNodeId }],
		createdAt: new Date(Date.UTC(2026, 7, 1, 0, sequence)).toISOString(),
		updatedAt: new Date(Date.UTC(2026, 7, 29, 0, -index)).toISOString(),
	}
})

const parseNonNegativeInteger = (value: string | null, fallback: number): number => {
	if (value === null || !/^\d+$/.test(value)) {
		return fallback
	}
	const parsed = Number(value)
	return Number.isSafeInteger(parsed) ? parsed : fallback
}

export const isPaginationDemoApiRequest = (request: Request): boolean => {
	const pathname = new URL(request.url).pathname
	return pathname === '/api' || pathname.startsWith('/api/')
}

export const onPaginationDemoUnhandledRequest: UnhandledRequestCallback = (request, print) => {
	if (isPaginationDemoApiRequest(request)) {
		print.error()
	}
}

export const createPaginationDemoResponse = (searchParams: URLSearchParams): WorkflowListResponse => {
	const cursor = parseNonNegativeInteger(searchParams.get('cursor'), 0)
	const requestedSize = parseNonNegativeInteger(searchParams.get('size'), PAGINATION_DEMO_PAGE_SIZE)
	const size = requestedSize > 0 ? requestedSize : PAGINATION_DEMO_PAGE_SIZE
	const nextOffset = Math.min(cursor + size, paginationDemoWorkflows.length)
	const hasNext = nextOffset < paginationDemoWorkflows.length

	return {
		success: true,
		data: {
			content: paginationDemoWorkflows.slice(cursor, nextOffset),
			size,
			hasNext,
			nextCursor: hasNext ? String(nextOffset) : null,
		},
		message: 'success',
		code: 'SUCCESS',
	}
}

export const createPaginationDemoWorkflowListHandler = (delayMs = PAGINATION_DEMO_REQUEST_DELAY_MS): HttpHandler =>
	http.get('*/api/v1/workflows', async ({ request }) => {
		await delay(delayMs)
		return HttpResponse.json(createPaginationDemoResponse(new URL(request.url).searchParams))
	})

export const paginationDemoWorkflowListHandler = createPaginationDemoWorkflowListHandler()
