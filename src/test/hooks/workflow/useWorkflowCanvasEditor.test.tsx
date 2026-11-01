import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWorkflowCanvasEditor } from '@/hooks/workflow/useWorkflowCanvasEditor'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import type { WorkflowNodeRole, WorkflowNodeType } from '@/types/workflow'
import { createWorkflowCanvasEdge } from '@/utils/workflow/mapWorkflowCanvas'

const createNode = (id: string, role: WorkflowNodeRole, x: number): WorkflowNodeType =>
	({ id, position: { x, y: 0 }, data: { role } }) as WorkflowNodeType

const nodes = [createNode('trigger', 'trigger', 0), createNode('ai', 'ai', 300), createNode('action', 'action', 600)]
const slackEntry = nodeCatalogEntriesFixture.find(entry => entry.id === 'slack_bot.send_channel_message')!

describe('useWorkflowCanvasEditor', () => {
	it('노드 위치는 드래그 종료 시에만 상위 편집 문서에 반영한다', () => {
		const onNodePositionCommit = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: [],
				onNodePositionCommit,
				onEdgesCommit: vi.fn(),
				onNodeAdd: vi.fn(),
				onNodesRemove: vi.fn(),
			})
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

	it('카탈로그 항목으로 만든 노드를 화면 가운데에 붙이고 편집 문서에 반영한다', () => {
		const onNodeAdd = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: [],
				onNodePositionCommit: vi.fn(),
				onEdgesCommit: vi.fn(),
				onNodeAdd,
				onNodesRemove: vi.fn(),
			})
		)
		const canvas = document.createElement('div')
		canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 800, height: 600 }) as DOMRect
		result.current.setCanvasElement(canvas)
		const screenToFlowPosition = vi.fn(({ x, y }: { x: number; y: number }) => ({ x: x - 100, y: y - 50 }))
		act(() => result.current.onInit({ screenToFlowPosition }))

		act(() => result.current.addCatalogNode(slackEntry))

		expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 500, y: 350 })
		const added = onNodeAdd.mock.calls[0][0]
		expect(added).toMatchObject({
			event: 'slack_bot.send_channel_message',
			position: { x: 268, y: 225 },
			config: { brand: 'slack' },
		})
		expect(result.current.nodes.map(node => node.id)).toEqual(['trigger', 'ai', 'action', added.id])
	})

	it('ReactFlow가 초기화되기 전에는 노드를 추가하지 않는다', () => {
		const onNodeAdd = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: [],
				onNodePositionCommit: vi.fn(),
				onEdgesCommit: vi.fn(),
				onNodeAdd,
				onNodesRemove: vi.fn(),
			})
		)
		result.current.setCanvasElement(document.createElement('div'))

		act(() => result.current.addCatalogNode(slackEntry))

		expect(onNodeAdd).not.toHaveBeenCalled()
		expect(result.current.nodes).toHaveLength(3)
	})

	it('연결 생성과 삭제를 편집 문서에 반영한다', () => {
		const onEdgesCommit = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: [],
				onNodePositionCommit: vi.fn(),
				onEdgesCommit,
				onNodeAdd: vi.fn(),
				onNodesRemove: vi.fn(),
			})
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
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: [edge],
				onNodePositionCommit: vi.fn(),
				onEdgesCommit,
				onNodeAdd: vi.fn(),
				onNodesRemove: vi.fn(),
			})
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

	it('노드를 지우면 그 노드에 닿은 연결을 뺀 연결 목록과 함께 편집 문서에 반영한다', () => {
		const edges = [
			createWorkflowCanvasEdge({ source: 'trigger', target: 'ai', conditionType: null }, 'trigger-ai'),
			createWorkflowCanvasEdge({ source: 'ai', target: 'action', conditionType: null }, 'ai-action'),
			createWorkflowCanvasEdge({ source: 'trigger', target: 'action', conditionType: null }, 'trigger-action'),
		]
		const onNodesRemove = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: edges,
				onNodePositionCommit: vi.fn(),
				onEdgesCommit: vi.fn(),
				onNodeAdd: vi.fn(),
				onNodesRemove,
			})
		)

		act(() => result.current.onNodesChange([{ id: 'ai', type: 'select', selected: true }]))
		expect(onNodesRemove).not.toHaveBeenCalled()

		act(() => result.current.onNodesChange([{ id: 'ai', type: 'remove' }]))

		expect(result.current.nodes.map(node => node.id)).toEqual(['trigger', 'action'])
		expect(result.current.edges.map(edge => edge.id)).toEqual(['trigger-action'])
		expect(onNodesRemove).toHaveBeenCalledOnce()
		expect(onNodesRemove).toHaveBeenCalledWith(['ai'], [expect.objectContaining({ id: 'trigger-action' })])
	})

	it('ReactFlow처럼 연결 remove 뒤 노드 remove가 이어지면 앞서 지운 연결이 빠진 목록을 넘긴다', () => {
		const edges = [
			createWorkflowCanvasEdge({ source: 'trigger', target: 'ai', conditionType: null }, 'trigger-ai'),
			createWorkflowCanvasEdge({ source: 'trigger', target: 'action', conditionType: null }, 'trigger-action'),
		]
		const onEdgesCommit = vi.fn()
		const onNodesRemove = vi.fn()
		const { result } = renderHook(() =>
			useWorkflowCanvasEditor({
				initialNodes: nodes,
				initialEdges: edges,
				onNodePositionCommit: vi.fn(),
				onEdgesCommit,
				onNodeAdd: vi.fn(),
				onNodesRemove,
			})
		)

		// 'ai' 노드와 함께 선택해 둔, 'ai'와 무관한 trigger-action 연결도 같은 삭제로 지운다.
		act(() => {
			result.current.onEdgesChange([
				{ id: 'trigger-ai', type: 'remove' },
				{ id: 'trigger-action', type: 'remove' },
			])
			result.current.onNodesChange([{ id: 'ai', type: 'remove' }])
		})

		expect(onEdgesCommit).toHaveBeenLastCalledWith([])
		expect(onNodesRemove).toHaveBeenCalledWith(['ai'], [])
		expect(result.current.edges).toEqual([])
	})
})
