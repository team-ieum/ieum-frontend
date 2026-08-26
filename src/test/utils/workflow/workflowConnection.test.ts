import { describe, expect, it } from 'vitest'
import type { WorkflowEdgeType, WorkflowNodeRole, WorkflowNodeType } from '@/types/workflow'
import { createWorkflowCanvasEdge } from '@/utils/workflow/mapWorkflowCanvas'
import { isWorkflowConnectionValid } from '@/utils/workflow/workflowConnection'

const createNode = (id: string, role: WorkflowNodeRole): WorkflowNodeType => ({ id, data: { role } }) as WorkflowNodeType

const nodes = [createNode('trigger', 'trigger'), createNode('ai', 'ai'), createNode('action', 'action')]

const createEdge = (source: string, target: string, id = `${source}-${target}`): WorkflowEdgeType =>
	createWorkflowCanvasEdge({ source, target, conditionType: null }, id)

describe('isWorkflowConnectionValid', () => {
	it('실행 방향에 맞는 새 연결을 허용한다', () => {
		expect(isWorkflowConnectionValid({ source: 'trigger', target: 'ai' }, nodes, [])).toBe(true)
	})

	it('시작 조건 대상, 자기 연결, 동일 방향 중복 연결을 차단한다', () => {
		const edges = [createEdge('trigger', 'ai')]

		expect(isWorkflowConnectionValid({ source: 'ai', target: 'trigger' }, nodes, edges)).toBe(false)
		expect(isWorkflowConnectionValid({ source: 'ai', target: 'ai' }, nodes, edges)).toBe(false)
		expect(isWorkflowConnectionValid({ source: 'trigger', target: 'ai' }, nodes, edges)).toBe(false)
	})

	it('기존 경로를 되돌아가는 순환 연결을 차단한다', () => {
		const edges = [createEdge('trigger', 'ai'), createEdge('ai', 'action')]

		expect(isWorkflowConnectionValid({ source: 'action', target: 'ai' }, nodes, edges)).toBe(false)
	})

	it('재연결할 때 현재 연결선은 중복과 순환 검사에서 제외한다', () => {
		const edge = createEdge('ai', 'action', 'editing-edge')

		expect(isWorkflowConnectionValid({ source: 'ai', target: 'action' }, nodes, [edge], edge.id)).toBe(true)
	})
})
