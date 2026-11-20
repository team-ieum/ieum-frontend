import { describe, expect, it } from 'vitest'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import { getOAuthDisconnectImpact } from '@/utils/integration/getOAuthDisconnectImpact'

const createWorkflow = (id: string, triggerType: string, active = true): IntegrationServiceWorkflowDto => ({
	id,
	name: `워크플로우 ${id}`,
	description: '',
	active,
	triggerType,
	usedNodeCount: 1,
	updatedAt: '2026-10-26T00:00:00Z',
})

describe('getOAuthDisconnectImpact', () => {
	it('영향받는 워크플로우가 없으면 빈 목록과 0개를 반환한다', () => {
		expect(getOAuthDisconnectImpact([])).toEqual({ totalCount: 0, automaticCount: 0, workflows: [] })
	})

	it.each([
		['SCHEDULE', true, '스케줄', '자동 실행 중', '해제 후에도 예약된 시간마다 실행을 시도해요.'],
		['webhook', true, '웹훅', '자동 실행 중', '해제 후에도 웹훅을 받을 때마다 실행을 시도해요.'],
		['MANUAL', true, '수동', '활성', null],
		['SCHEDULE', false, '스케줄', '일시정지', null],
		['WEBHOOK', false, '웹훅', '일시정지', null],
		['GITHUB_NEW_ISSUE', true, 'GitHub 이슈', '활성', null],
		['unknown_trigger', true, 'unknown_trigger', '활성', null],
	] as const)(
		'%s 트리거와 활성 상태 %s에 따라 실행 상태와 문구를 반환한다',
		(trigger, active, triggerLabel, statusLabel, automaticNotice) => {
			const result = getOAuthDisconnectImpact([createWorkflow('A', trigger, active)])
			expect(result).toEqual({
				totalCount: 1,
				automaticCount: automaticNotice === null ? 0 : 1,
				workflows: [{ id: 'A', name: '워크플로우 A', statusLabel, triggerLabel, automaticNotice }],
			})
		}
	)

	it('처음 세 워크플로우의 순서를 유지하고 생략된 워크플로우도 자동 실행 집계에 포함한다', () => {
		const result = getOAuthDisconnectImpact([
			createWorkflow('B', 'SCHEDULE'),
			createWorkflow('A', 'MANUAL'),
			createWorkflow('D', 'WEBHOOK', false),
			createWorkflow('C', 'WEBHOOK'),
			createWorkflow('E', 'SCHEDULE', false),
		])
		expect(result.totalCount).toBe(5)
		expect(result.automaticCount).toBe(2)
		expect(result.workflows.map(workflow => workflow.id)).toEqual(['B', 'A', 'D'])
	})
})
