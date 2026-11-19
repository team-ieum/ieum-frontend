import { describe, expect, it } from 'vitest'
import type { IntegrationServiceWorkflowDto } from '@/types/integrationWorkflows'
import { formatDisconnectImpactNotice } from '@/utils/integration/formatDisconnectImpactNotice'

const createWorkflow = (id: string, triggerType: string, active = true): IntegrationServiceWorkflowDto => ({
	id,
	name: `워크플로우 ${id}`,
	description: '',
	active,
	triggerType,
	usedNodeCount: 1,
	updatedAt: '2026-10-26T00:00:00Z',
})

describe('formatDisconnectImpactNotice', () => {
	it('워크플로우가 없으면 Google과 같은 빈 목록 안내를 반환한다', () => {
		expect(formatDisconnectImpactNotice([])).toBe('이 연결을 쓰는 워크플로우는 없어요.')
	})

	it('수동 실행과 비활성 워크플로우는 이름만 안내한다', () => {
		const notice = formatDisconnectImpactNotice([createWorkflow('A', 'MANUAL'), createWorkflow('B', 'SCHEDULE', false)])

		expect(notice).toBe('이 연결을 쓰는 워크플로우 2개는 실행할 때 실패해요: 워크플로우 A, 워크플로우 B.')
	})

	it('처음 세 이름과 남은 개수를 요약하고 전체 목록의 활성 스케줄과 웹훅 수를 안내한다', () => {
		const notice = formatDisconnectImpactNotice([
			createWorkflow('1', 'SCHEDULE'),
			createWorkflow('2', 'MANUAL'),
			createWorkflow('3', 'SCHEDULE', false),
			createWorkflow('4', 'WEBHOOK'),
			createWorkflow('5', 'UNKNOWN_TRIGGER'),
			createWorkflow('6', 'WEBHOOK', false),
		])

		expect(notice).toBe(
			'이 연결을 쓰는 워크플로우 6개는 실행할 때 실패해요: 워크플로우 1, 워크플로우 2, 워크플로우 3 외 3개. ' +
				'이 중 2개는 연결을 해제해도 계속 자동 실행을 시도해요.'
		)
	})
})
