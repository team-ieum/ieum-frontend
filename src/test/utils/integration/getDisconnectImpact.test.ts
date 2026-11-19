import { describe, expect, it } from 'vitest'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import { getDisconnectImpact } from '@/utils/integration/getDisconnectImpact'

const createWorkflow = (id: string, triggerType: string, active = true): IntegrationServiceWorkflowDto => ({
	id,
	name: `워크플로우 ${id}`,
	description: '',
	active,
	triggerType,
	usedNodeCount: 1,
	updatedAt: '2026-10-26T00:00:00Z',
})

describe('getDisconnectImpact', () => {
	it('연동을 사용하는 워크플로우가 없으면 빈 목록과 0건을 반환한다', () => {
		expect(getDisconnectImpact([])).toEqual({ workflows: [], automaticCount: 0 })
	})

	it('모든 워크플로우를 보여주고 활성 스케줄과 웹훅만 자동 실행 영향으로 집계한다', () => {
		const impact = getDisconnectImpact([
			createWorkflow('1', 'SCHEDULE'),
			createWorkflow('2', 'MANUAL'),
			createWorkflow('3', 'WEBHOOK'),
			createWorkflow('4', 'EVENT'),
			createWorkflow('5', 'GMAIL_NEW_EMAIL'),
			createWorkflow('6', 'UNKNOWN_TRIGGER'),
			createWorkflow('7', 'SCHEDULE', false),
			createWorkflow('8', 'WEBHOOK', false),
		])

		expect(impact).toEqual({
			workflows: [
				{ id: '1', name: '워크플로우 1', isActive: true, isAutomaticExecutionAtRisk: true },
				{ id: '2', name: '워크플로우 2', isActive: true, isAutomaticExecutionAtRisk: false },
				{ id: '3', name: '워크플로우 3', isActive: true, isAutomaticExecutionAtRisk: true },
				{ id: '4', name: '워크플로우 4', isActive: true, isAutomaticExecutionAtRisk: false },
				{ id: '5', name: '워크플로우 5', isActive: true, isAutomaticExecutionAtRisk: false },
				{ id: '6', name: '워크플로우 6', isActive: true, isAutomaticExecutionAtRisk: false },
				{ id: '7', name: '워크플로우 7', isActive: false, isAutomaticExecutionAtRisk: false },
				{ id: '8', name: '워크플로우 8', isActive: false, isAutomaticExecutionAtRisk: false },
			],
			automaticCount: 2,
		})
	})
})
