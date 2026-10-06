import { describe, expect, it } from 'vitest'
import { WORKFLOW_CATEGORY_META, WORKFLOW_SERVICE_META, WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowListFilters, WorkflowListItem, WorkflowSortKey } from '@/types/workflowList'
import { selectActiveWorkflowFilters, selectWorkflowCounts, selectWorkflows } from '@/utils/workflow/workflowListSelectors'

const emptyFilters: WorkflowListFilters = { services: [], categories: [], statuses: [] }

const createWorkflow = (overrides: Partial<WorkflowListItem>): WorkflowListItem => ({
	id: 'a',
	name: '다 알림',
	desc: '주문 도착 안내',
	tags: ['태그전용검색어'],
	services: ['slack'],
	category: 'ops',
	status: 'active',
	trigger: 'schedule',
	lastRun: '2026-09-01T00:00:00Z',
	success: 0,
	...overrides,
})

const workflows: WorkflowListItem[] = [
	createWorkflow({}),
	createWorkflow({
		id: 'b',
		name: '가 문서',
		services: ['notion'],
		category: 'dev',
		status: 'paused',
		lastRun: '2026-09-03T00:00:00Z',
	}),
	createWorkflow({
		id: 'c',
		name: '나 보고서',
		services: ['github'],
		category: 'data',
		status: 'error',
		lastRun: '2026-09-02T00:00:00Z',
	}),
	createWorkflow({
		id: 'd',
		name: '라 알림',
		services: ['slack', 'notion'],
		status: 'error',
		lastRun: '2026-09-04T00:00:00Z',
	}),
]

describe('selectWorkflows', () => {
	it.each(['다 알림', '주문 도착', '내부 운영', '활성', '스케줄', '  sLaCk  '])(
		'이름·설명·분류·상태·트리거·서비스 표시 이름에서 %s 검색을 지원한다',
		search => {
			expect(selectWorkflows([workflows[0]], emptyFilters, search, 'recent')).toEqual([workflows[0]])
		}
	)

	it('공백 검색은 전체를 유지하고 태그와 일치하지 않는 검색어는 제외한다', () => {
		expect(selectWorkflows(workflows, emptyFilters, '   ', 'recent')).toHaveLength(4)
		expect(selectWorkflows(workflows, emptyFilters, '태그전용검색어', 'recent')).toEqual([])
		expect(selectWorkflows(workflows, emptyFilters, '존재하지 않는 검색어', 'recent')).toEqual([])
	})

	it('같은 종류의 필터는 OR, 다른 종류의 필터와 검색은 AND로 적용한다', () => {
		const filters: WorkflowListFilters = {
			services: ['slack', 'notion'],
			categories: ['ops', 'dev'],
			statuses: ['active', 'paused'],
		}

		expect(selectWorkflows(workflows, filters, '', 'name').map(workflow => workflow.id)).toEqual(['b', 'a'])
		expect(selectWorkflows(workflows, filters, '알림', 'name').map(workflow => workflow.id)).toEqual(['a'])
	})

	it.each<[WorkflowSortKey, string[]]>([
		['recent', ['d', 'b', 'c', 'a']],
		['name', ['b', 'c', 'a', 'd']],
		['status', ['c', 'd', 'a', 'b']],
	])('%s 정렬을 적용하면서 원본 목록과 항목을 변경하지 않는다', (sort, expectedIds) => {
		const original = structuredClone(workflows)
		const result = selectWorkflows(workflows, emptyFilters, '', sort)

		expect(result.map(workflow => workflow.id)).toEqual(expectedIds)
		expect(result).not.toBe(workflows)
		expect(workflows).toEqual(original)
	})

	it('기본순은 표시용 updatedAt이 아닌 기존 lastRun 기준을 유지한다', () => {
		const older = createWorkflow({ id: 'older', updatedAt: '2026-09-06T00:00:00Z' })
		const newer = createWorkflow({ id: 'newer', lastRun: '2026-09-02T00:00:00Z' })

		expect(selectWorkflows([older, newer], emptyFilters, '', 'recent').map(workflow => workflow.id)).toEqual([
			'newer',
			'older',
		])
	})

	it('빈 목록은 모든 정렬 방식에서 빈 목록을 반환한다', () => {
		for (const sort of ['recent', 'name', 'status'] as const) {
			expect(selectWorkflows([], emptyFilters, '', sort)).toEqual([])
		}
	})
})

describe('selectWorkflowCounts', () => {
	it('검색 결과와 관계없이 전달한 전체 목록의 서비스·분류·상태를 집계한다', () => {
		const filtered = selectWorkflows(workflows, emptyFilters, '다 알림', 'recent')
		const counts = selectWorkflowCounts(workflows)

		expect(filtered).toHaveLength(1)
		expect(counts.serviceCounts).toMatchObject({ slack: 2, notion: 2, github: 1, gmail: 0 })
		expect(counts.categoryCounts).toEqual({ cs: 0, marketing: 0, dev: 1, sales: 0, ops: 2, data: 1 })
		expect(counts.statusCounts).toEqual({ active: 1, paused: 1, error: 2 })
	})

	it('빈 목록에서도 모든 메타 키에 0을 제공한다', () => {
		const counts = selectWorkflowCounts([])

		expect(counts.serviceCounts).toEqual(Object.fromEntries(Object.keys(WORKFLOW_SERVICE_META).map(id => [id, 0])))
		expect(counts.categoryCounts).toEqual(Object.fromEntries(Object.keys(WORKFLOW_CATEGORY_META).map(id => [id, 0])))
		expect(counts.statusCounts).toEqual(Object.fromEntries(Object.keys(WORKFLOW_STATUS_META).map(id => [id, 0])))
	})
})

describe('selectActiveWorkflowFilters', () => {
	it('종류별 순서와 선택 순서를 유지하면서 필터 표시 메타를 반환한다', () => {
		const filters: WorkflowListFilters = {
			services: ['notion', 'slack'],
			categories: ['ops'],
			statuses: ['paused'],
		}
		const original = structuredClone(filters)

		expect(selectActiveWorkflowFilters(filters)).toEqual([
			{ kind: 'services', id: 'notion', label: 'Notion', serviceId: 'notion' },
			{ kind: 'services', id: 'slack', label: 'Slack', serviceId: 'slack' },
			{ kind: 'categories', id: 'ops', label: '내부 운영', dotClass: WORKFLOW_CATEGORY_META.ops.dotClass },
			{ kind: 'statuses', id: 'paused', label: '일시정지', status: 'paused' },
		])
		expect(filters).toEqual(original)
	})

	it('선택된 필터가 없으면 빈 목록을 반환한다', () => {
		expect(selectActiveWorkflowFilters(emptyFilters)).toEqual([])
	})
})
