import { describe, expect, it } from 'vitest'
import type { WorkflowDto } from '@/types/workflowList'
import { mapWorkflowDtoToListItem, normalizeServiceIds } from '@/utils/workflow/mapWorkflowDtoToListItem'

const dto: WorkflowDto = {
	id: 'workflow-1',
	userId: 'user-1',
	name: '주문 알림',
	description: '새 주문을 안내합니다',
	active: true,
	triggerType: ' SCHEDULE ',
	cronExpression: '0 0 9 * * *',
	version: 1,
	services: ['SLACK', 'NOTION'],
	nodes: [
		{ id: 'slack', type: 'HTTP', label: 'Slack 알림', config: { brand: 'Slack' } },
		{ id: 'notion', type: 'NOTION', label: 'Notion 기록', config: {} },
	],
	edges: [],
	createdAt: '2026-09-01T00:00:00Z',
	updatedAt: '2026-09-06T00:00:00Z',
}

describe('normalizeServiceIds', () => {
	it('API 서비스 값을 소문자 서비스 ID로 바꾸고 알 수 없는 값과 중복을 제거한다', () => {
		expect(normalizeServiceIds(['SLACK', ' Notion ', 'slack', 'UNKNOWN', '', 'GITHUB'])).toEqual([
			'slack',
			'notion',
			'github',
		])
		expect(normalizeServiceIds([])).toEqual([])
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

	it('노드 구성과 관계없이 API services로 서비스 목록을 만든다', () => {
		expect(mapWorkflowDtoToListItem({ ...dto, services: ['DISCORD'] }).services).toEqual(['discord'])
		expect(mapWorkflowDtoToListItem({ ...dto, services: [] }).services).toEqual([])
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
		const emptyDto = {
			...dto,
			active: false,
			description: null,
			services: [],
			nodes: null,
			cronExpression: null,
		} as unknown as WorkflowDto

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
