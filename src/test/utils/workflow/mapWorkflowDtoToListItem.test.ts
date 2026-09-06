import { describe, expect, it } from 'vitest'
import type { WorkflowDto, WorkflowNodeDto } from '@/types/workflowList'
import { extractServicesFromNodes, mapWorkflowDtoToListItem } from '@/utils/workflow/mapWorkflowDtoToListItem'

const dto: WorkflowDto = {
	id: 'workflow-1',
	userId: 'user-1',
	name: '주문 알림',
	description: '새 주문을 안내합니다',
	active: true,
	triggerType: ' SCHEDULE ',
	cronExpression: '0 0 9 * * *',
	version: 1,
	nodes: [
		{ id: 'slack', type: 'HTTP', label: 'Slack 알림', config: { brand: 'Slack' } },
		{ id: 'notion', type: 'NOTION', label: 'Notion 기록', config: {} },
	],
	edges: [],
	createdAt: '2026-09-01T00:00:00Z',
	updatedAt: '2026-09-06T00:00:00Z',
}

describe('extractServicesFromNodes', () => {
	it('brand와 type을 정규화하고 알려진 서비스를 등장 순서대로 중복 제거한다', () => {
		const nodes: WorkflowNodeDto[] = [
			{ id: '1', type: ' NOTION ', label: '', config: { brand: ' sLaCk ' } },
			{ id: '2', type: 'slack', label: '', config: { brand: 'Notion' } },
			{ id: '3', type: ' GITHUB ', label: '', config: { brand: 'unknown-service' } },
			{ id: '4', type: 'HTTP', label: '', config: { brand: 123 } },
			{ id: '5', type: 'unknown', label: '', config: { brand: ' ' } },
		]

		expect(extractServicesFromNodes(nodes)).toEqual(['slack', 'notion', 'github'])
		expect(extractServicesFromNodes([])).toEqual([])
	})
})

describe('mapWorkflowDtoToListItem', () => {
	it('DTO를 기존 목록 필드와 임시 기본값으로 변환하며 원본을 유지한다', () => {
		const original = structuredClone(dto)

		expect(mapWorkflowDtoToListItem(dto)).toEqual({
			id: 'workflow-1',
			name: '주문 알림',
			desc: '새 주문을 안내합니다',
			tags: [],
			services: ['slack', 'notion'],
			category: 'ops',
			status: 'active',
			trigger: 'schedule',
			cronExpression: '0 0 9 * * *',
			nodeCount: 2,
			updatedAt: '2026-09-06T00:00:00Z',
			lastRun: '2026-09-06T00:00:00Z',
			success: 0,
		})
		expect(dto).toEqual(original)
	})

	it.each([
		[' WEBHOOK ', 'webhook'],
		['EVENT', 'event'],
		['Manual', 'manual'],
		['unknown', 'manual'],
		['', 'manual'],
	])('트리거 %s를 %s로 정규화한다', (triggerType, trigger) => {
		expect(mapWorkflowDtoToListItem({ ...dto, triggerType }).trigger).toBe(trigger)
	})

	it('비활성 DTO는 paused로 표시하고 비어 있는 설명·노드의 기본값을 유지한다', () => {
		const emptyDto = { ...dto, active: false, description: null, nodes: null, cronExpression: null } as unknown as WorkflowDto

		expect(mapWorkflowDtoToListItem(emptyDto)).toMatchObject({
			desc: '',
			tags: [],
			services: [],
			category: 'ops',
			status: 'paused',
			cronExpression: null,
			nodeCount: 0,
			success: 0,
		})
	})
})
