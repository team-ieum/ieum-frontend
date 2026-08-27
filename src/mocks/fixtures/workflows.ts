import type { ApiResponse } from '@/types/api'
import type { WorkflowDto, WorkflowListResponse } from '@/types/workflowList'

export const WORKFLOW_FIXTURE_ID = '11111111-1111-4111-8111-111111111111'

export const workflowFixture = {
	id: WORKFLOW_FIXTURE_ID,
	userId: '22222222-2222-4222-8222-222222222222',
	name: '고객 문의 자동 분류',
	description: '접수된 문의를 AI로 분류합니다.',
	active: true,
	triggerType: 'MANUAL',
	cronExpression: '',
	version: 3,
	nodes: [
		{
			id: 'trigger-1',
			type: 'TRIGGER',
			label: '수동 실행',
			description: '테스트 트리거',
			position: { x: 120, y: 180 },
			config: {},
		},
		{
			id: 'http-1',
			type: 'HTTP',
			label: '문의 전달',
			description: '분류 결과를 전달합니다.',
			position: { x: 420, y: 180 },
			config: { method: 'POST', url: 'https://example.com/hooks/inquiry', brand: 'slack' },
		},
	],
	edges: [{ source: 'trigger-1', target: 'http-1' }],
	createdAt: '2026-08-01T01:00:00Z',
	updatedAt: '2026-08-26T09:30:00Z',
} satisfies WorkflowDto

export const emptyWorkflowFixture = {
	...workflowFixture,
	name: '빈 워크플로우',
	description: '',
	nodes: [],
	edges: [],
} satisfies WorkflowDto

export const workflowListResponse = {
	success: true,
	data: {
		content: [workflowFixture],
		size: 20,
		hasNext: false,
		nextCursor: '',
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies WorkflowListResponse

export const emptyWorkflowListResponse = {
	...workflowListResponse,
	data: {
		...workflowListResponse.data,
		content: [],
	},
} satisfies WorkflowListResponse

export const workflowDetailResponse = {
	success: true,
	data: workflowFixture,
	message: 'success',
	code: 'SUCCESS',
} satisfies ApiResponse<WorkflowDto>

export const emptyWorkflowDetailResponse = {
	...workflowDetailResponse,
	data: emptyWorkflowFixture,
} satisfies ApiResponse<WorkflowDto>
