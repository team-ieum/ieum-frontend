import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowListItem } from '@/types/workflowList'
import { mapWorkflowListItemToRowView } from '@/utils/workflow/mapWorkflowListItemToRowView'

const workflow: WorkflowListItem = {
	id: 'workflow-1',
	name: '주문 알림',
	desc: '',
	tags: [],
	services: ['slack', 'notion'],
	category: 'ops',
	status: 'active',
	trigger: 'schedule',
	cronExpression: '0 0 9 * * *',
	nodeCount: 3,
	updatedAt: '2026-09-06T11:50:00Z',
	lastRun: '2026-09-05T12:00:00Z',
	success: 0,
}

describe('mapWorkflowListItemToRowView', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-09-06T12:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('서비스 표시 이름과 상태 스타일을 변환하고 updatedAt의 상대 시간을 우선한다', () => {
		const original = structuredClone(workflow)

		expect(mapWorkflowListItemToRowView(workflow)).toEqual({
			id: 'workflow-1',
			name: '주문 알림',
			services: ['slack', 'notion'],
			serviceNamesLabel: 'Slack · Notion',
			hasServices: true,
			nodeCount: 3,
			updatedAtRelative: '10분 전',
			status: 'active',
			statusBarClass: WORKFLOW_STATUS_META.active.barClass,
			trigger: 'schedule',
			cronExpression: '0 0 9 * * *',
		})
		expect(workflow).toEqual(original)
	})

	it('서비스·노드 개수가 없으면 빈 표시와 0을 사용하고 lastRun으로 시간을 표시한다', () => {
		expect(
			mapWorkflowListItemToRowView({
				...workflow,
				services: [],
				nodeCount: undefined,
				updatedAt: undefined,
				lastRun: '2026-09-06T11:30:00Z',
				status: 'paused',
			})
		).toMatchObject({
			serviceNamesLabel: '',
			hasServices: false,
			nodeCount: 0,
			updatedAtRelative: '30분 전',
			status: 'paused',
			statusBarClass: WORKFLOW_STATUS_META.paused.barClass,
		})
	})

	it('잘못된 날짜는 대시로 표시한다', () => {
		expect(mapWorkflowListItemToRowView({ ...workflow, updatedAt: 'invalid-date' }).updatedAtRelative).toBe('–')
	})
})
