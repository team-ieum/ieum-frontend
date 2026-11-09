import type {
	WorkflowDashboardErrorsResponse,
	WorkflowDashboardExecutionsResponse,
	WorkflowDashboardSummaryResponse,
} from '@/types/workflowDashboard'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'

export const dashboardSummaryResponse = {
	success: true,
	data: {
		metrics: {
			todayRuns: 42,
			percentageChange: 0.125,
			averageDurationSeconds: 2.4,
			successRate: 0.976,
		},
		hourlyCounts: { '08': 3, '09': 11, '10': 17 },
		workflowStats: {
			total: 8,
			active: 5,
			inactive: 2,
			errored: 1,
			running: 1,
		},
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies WorkflowDashboardSummaryResponse

export const emptyDashboardSummaryResponse = {
	...dashboardSummaryResponse,
	data: {
		metrics: {
			todayRuns: 0,
			percentageChange: 0,
			averageDurationSeconds: 0,
			successRate: 0,
		},
		hourlyCounts: {},
		workflowStats: {
			total: 0,
			active: 0,
			inactive: 0,
			errored: 0,
			running: 0,
		},
	},
} satisfies WorkflowDashboardSummaryResponse

export const dashboardExecutionsResponse = {
	success: true,
	data: {
		content: [
			{
				id: '33333333-3333-4333-8333-333333333333',
				workflowId: WORKFLOW_FIXTURE_ID,
				workflowName: '고객 문의 자동 분류',
				status: 'SUCCESS',
				durationSeconds: 2.4,
				triggerType: 'MANUAL',
				startedAt: '2026-08-26T09:30:00Z',
				finishedAt: '2026-08-26T09:30:02Z',
			},
		],
		size: 20,
		hasNext: false,
		nextCursor: '',
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies WorkflowDashboardExecutionsResponse

export const emptyDashboardExecutionsResponse = {
	...dashboardExecutionsResponse,
	data: {
		...dashboardExecutionsResponse.data,
		content: [],
	},
} satisfies WorkflowDashboardExecutionsResponse

export const dashboardErrorsResponse = {
	success: true,
	data: {
		content: [
			{
				executionId: '44444444-4444-4444-8444-444444444444',
				workflowId: WORKFLOW_FIXTURE_ID,
				workflowName: '고객 문의 자동 분류',
				failedNodeId: 'http-1',
				failedNodeType: 'HTTP',
				errorMessage: '외부 서비스 응답 지연',
				startedAt: '2026-08-26T09:20:00Z',
				finishedAt: '2026-08-26T09:20:10Z',
			},
		],
		size: 20,
		hasNext: false,
		nextCursor: '',
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies WorkflowDashboardErrorsResponse

export const emptyDashboardErrorsResponse = {
	...dashboardErrorsResponse,
	data: {
		...dashboardErrorsResponse.data,
		content: [],
	},
} satisfies WorkflowDashboardErrorsResponse

/** 실행 실패 1건과, 노드 실행 전 정적 검증에서 거부된 실행 1건을 함께 담은 오류 목록 */
export const dashboardErrorsWithValidationFailureResponse = {
	...dashboardErrorsResponse,
	data: {
		...dashboardErrorsResponse.data,
		content: [
			{
				executionId: '55555555-5555-4555-8555-555555555555',
				workflowId: WORKFLOW_FIXTURE_ID,
				workflowName: '고객 문의 자동 분류',
				failedNodeId: null,
				failedNodeType: null,
				errorMessage: '검증 실패 2건: 메시지를 보낼 채널을 골라 주세요.',
				startedAt: '2026-08-26T09:25:00Z',
				finishedAt: '2026-08-26T09:25:00Z',
			},
			...dashboardErrorsResponse.data.content,
		],
	},
} satisfies WorkflowDashboardErrorsResponse
