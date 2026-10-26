import { describe, expect, it } from 'vitest'
import type { WorkflowExecutionDto } from '@/types/workflowDashboard'
import { mapWorkflowExecutionToRunRow } from '@/utils/dashboard/mapWorkflowDashboardExecution'

const execution: WorkflowExecutionDto = {
	id: '0f3c2a9e-0d4b-4c1e-9a77-2b3f5d8e1a10',
	workflowId: 'workflow-1',
	workflowName: '메일 요약',
	status: 'SUCCESS',
	durationSeconds: 3,
	triggerType: 'MANUAL',
	startedAt: '2026-10-26T00:00:00Z',
	finishedAt: '2026-10-26T00:00:03Z',
}

describe('mapWorkflowExecutionToRunRow', () => {
	it.each([
		['GMAIL_NEW_EMAIL', 'Gmail 메일', 'gmail'],
		['github_new_issue', 'GitHub 이슈', 'github'],
	])('앱 트리거 %s는 라벨과 로고용 brand를 함께 반환한다', (triggerType, trigger, triggerBrand) => {
		expect(mapWorkflowExecutionToRunRow({ ...execution, triggerType })).toMatchObject({ trigger, triggerBrand })
	})

	it('앱 트리거가 아니면 기존 라벨만 반환하고 brand를 비운다', () => {
		const row = mapWorkflowExecutionToRunRow(execution)

		expect(row.trigger).toBe('수동')
		expect(row.triggerBrand).toBeUndefined()
	})
})
