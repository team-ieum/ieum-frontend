import type { StatusPillItem, UseWorkflowStatusSummaryResult } from '../../types/dashboard'

const MOCK_WORKFLOW_PILLS: StatusPillItem[] = [
	{ label: '활성', value: 8, sub: '정상 실행 중', tone: 'active' },
	{ label: '비활성', value: 3, sub: '중지됨', tone: 'inactive' },
	{ label: '오류 있음', value: 1, sub: '점검 필요', tone: 'error' },
	{ label: '실행 중', value: 2, sub: '지금 처리 중', tone: 'running' },
]

export const useWorkflowStatusSummary = (): UseWorkflowStatusSummaryResult => ({
	workflow: {
		totalCount: 12,
		pills: MOCK_WORKFLOW_PILLS,
	},
})
