import { describe, expect, it } from 'vitest'
import type { WorkflowDashboardErrorDto } from '@/types/workflowDashboard'
import { mapWorkflowDashboardErrorToRow } from '@/utils/dashboard/mapWorkflowDashboardError'

const nodeFailure: WorkflowDashboardErrorDto = {
	executionId: '44444444-4444-4444-8444-444444444444',
	workflowId: 'workflow-1',
	workflowName: '고객 문의 자동 분류',
	failedNodeId: 'http-1',
	failedNodeType: 'HTTP',
	errorMessage: '외부 서비스 응답 지연',
	startedAt: '2026-08-26T09:20:00Z',
	finishedAt: '2026-08-26T09:20:10Z',
}

const rejectedBeforeRun: WorkflowDashboardErrorDto = { ...nodeFailure, failedNodeId: null, failedNodeType: null }

describe('mapWorkflowDashboardErrorToRow', () => {
	it('행 id는 실패 노드와 관계없이 executionId이고 workflowId를 함께 담는다', () => {
		expect(mapWorkflowDashboardErrorToRow(nodeFailure)).toMatchObject({
			id: '44444444-4444-4444-8444-444444444444',
			workflowId: 'workflow-1',
		})
		expect(mapWorkflowDashboardErrorToRow(rejectedBeforeRun).id).toBe('44444444-4444-4444-8444-444444444444')
	})

	it('실패 노드가 없고 메시지가 "검증 실패 "로 시작하면 validation 행으로 만든다', () => {
		const errorMessage = '검증 실패 2건: 메시지를 보낼 채널을 골라 주세요.'

		expect(mapWorkflowDashboardErrorToRow({ ...rejectedBeforeRun, errorMessage })).toMatchObject({
			kind: 'validation',
			title: errorMessage,
		})
	})

	it('실패 노드가 없어도 검증 실패 메시지가 아니면 메시지를 제목으로 둔 execution 행으로 만든다', () => {
		const errorMessage = '실행 대기열이 가득 찼습니다.'

		expect(mapWorkflowDashboardErrorToRow({ ...rejectedBeforeRun, errorMessage })).toMatchObject({
			kind: 'execution',
			title: errorMessage,
		})
	})

	it('실패 노드가 있으면 메시지가 "검증 실패 "로 시작해도 execution 행으로 만든다', () => {
		expect(mapWorkflowDashboardErrorToRow(nodeFailure)).toMatchObject({ kind: 'execution', title: '외부 서비스 응답 지연' })
		expect(mapWorkflowDashboardErrorToRow({ ...nodeFailure, errorMessage: '검증 실패 1건: 값이 없습니다.' }).kind).toBe(
			'execution'
		)
	})
})
