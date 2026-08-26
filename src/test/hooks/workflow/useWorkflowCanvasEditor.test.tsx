import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWorkflowCanvasEditor } from '@/hooks/workflow/useWorkflowCanvasEditor'
import type { WorkflowNodeRole, WorkflowNodeType } from '@/types/workflow'
import { createWorkflowCanvasEdge } from '@/utils/workflow/mapWorkflowCanvas'

const createNode = (id: string, role: WorkflowNodeRole, x: number): WorkflowNodeType =>
	({ id, position: { x, y: 0 }, data: { role } }) as WorkflowNodeType

const nodes = [createNode('trigger', 'trigger', 0), createNode('ai', 'ai', 300), createNode('action', 'action', 600)]

describe('useWorkflowCanvasEditor', () => {
	it('노드 위치는 드래그 종료 시에만 상위 편집 문서에 반영한다', () => {
		const onNodePositionCommit = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({ initialNodes: nodes, initialEdges: [], onNodePositionCommit, onEdgesCommit: vi.fn() })
		)

		act(() => {
			result.current.onNodesChange([{ id: 'trigger', type: 'position', position: { x: 100, y: 80 }, dragging: true }])
		})
		expect(onNodePositionCommit).not.toHaveBeenCalled()

		act(() => {
			result.current.onNodeDragStop({} as never, { ...nodes[0], position: { x: 100, y: 80 } }, result.current.nodes)
		})
		expect(onNodePositionCommit).toHaveBeenCalledWith('trigger', { x: 100, y: 80 })
	})

	it('연결 생성과 삭제를 편집 문서에 반영한다', () => {
		const onEdgesCommit = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({ initialNodes: nodes, initialEdges: [], onNodePositionCommit: vi.fn(), onEdgesCommit })
		)

		act(() => {
			result.current.onConnect({ source: 'trigger', target: 'ai', sourceHandle: null, targetHandle: null })
		})
		expect(result.current.edges).toHaveLength(1)
		expect(onEdgesCommit).toHaveBeenLastCalledWith(
			expect.arrayContaining([expect.objectContaining({ source: 'trigger', target: 'ai' })])
		)

		act(() => {
			result.current.onEdgesChange([{ id: result.current.edges[0].id, type: 'remove' }])
		})
		expect(result.current.edges).toHaveLength(0)
		expect(onEdgesCommit).toHaveBeenLastCalledWith([])
	})

	it('기존 연결선을 유효한 대상에 재연결한다', () => {
		const edge = createWorkflowCanvasEdge({ source: 'trigger', target: 'ai', conditionType: 'SUCCESS' }, 'edge-1')
		const onEdgesCommit = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({ initialNodes: nodes, initialEdges: [edge], onNodePositionCommit: vi.fn(), onEdgesCommit })
		)

		act(() => {
			result.current.onReconnect(edge, { source: 'trigger', target: 'action', sourceHandle: null, targetHandle: null })
		})

		expect(result.current.edges[0]).toMatchObject({
			source: 'trigger',
			target: 'action',
			data: { conditionType: 'SUCCESS' },
		})
	})
})
