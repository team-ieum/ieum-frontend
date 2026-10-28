import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	reconnectEdge,
	type Connection,
	type EdgeChange,
	type NodeChange,
	type OnConnect,
	type OnNodeDrag,
	type OnReconnect,
	type ReactFlowInstance,
	useEdgesState,
	useNodesState,
} from '@xyflow/react'
import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { createWorkflowCanvasEdge, toWorkflowCanvasNodes } from '@/utils/workflow/mapWorkflowCanvas'
import { createWorkflowNodeFromCatalogEntry } from '@/utils/workflow/nodeCatalog'
import { getNodeRect, placeNewNode } from '@/utils/workflow/placeNewNode'
import { isWorkflowConnectionValid } from '@/utils/workflow/workflowConnection'

// 노드 배치에는 화면 좌표 변환만 쓰므로, 표시용 노드 타입이 다른 ReactFlow 인스턴스도 받을 수 있게 필요한 메서드만 요구한다.
type CanvasFlowPositioner = Pick<ReactFlowInstance, 'screenToFlowPosition'>

type UseWorkflowCanvasEditorOptions = {
	initialNodes: WorkflowNodeType[]
	initialEdges: WorkflowEdgeType[]
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
	/** 캔버스에서 새로 만든 노드를 편집 문서에 반영한다. */
	onNodeAdd: (node: WorkflowNodeDto) => void
}

export const useWorkflowCanvasEditor = ({
	initialNodes,
	initialEdges,
	onNodePositionCommit,
	onEdgesCommit,
	onNodeAdd,
}: UseWorkflowCanvasEditorOptions) => {
	const [nodes, setNodes] = useNodesState<WorkflowNodeType>(initialNodes)
	const [edges, setEdges] = useEdgesState<WorkflowEdgeType>(initialEdges)
	const nodesRef = useRef(nodes)
	const edgesRef = useRef(edges)
	const reconnectingEdgeIdRef = useRef<string | null>(null)

	const onNodesChange = useCallback(
		(changes: NodeChange<WorkflowNodeType>[]) => {
			const nextNodes = applyNodeChanges(changes, nodesRef.current)
			nodesRef.current = nextNodes
			setNodes(nextNodes)
		},
		[setNodes]
	)

	const commitEdges = useCallback(
		(nextEdges: WorkflowEdgeType[]) => {
			edgesRef.current = nextEdges
			setEdges(nextEdges)
			onEdgesCommit(nextEdges)
		},
		[onEdgesCommit, setEdges]
	)

	const onEdgesChange = useCallback(
		(changes: EdgeChange<WorkflowEdgeType>[]) => {
			const nextEdges = applyEdgeChanges(changes, edgesRef.current)
			edgesRef.current = nextEdges
			setEdges(nextEdges)
			if (changes.some(change => change.type === 'remove')) onEdgesCommit(nextEdges)
		},
		[onEdgesCommit, setEdges]
	)

	const isValidConnection = useCallback(
		(connection: Connection | WorkflowEdgeType) =>
			isWorkflowConnectionValid(connection, nodesRef.current, edgesRef.current, reconnectingEdgeIdRef.current),
		[]
	)

	const onConnect = useCallback<OnConnect>(
		connection => {
			if (!isWorkflowConnectionValid(connection, nodesRef.current, edgesRef.current)) return
			const edge = createWorkflowCanvasEdge(
				{ source: connection.source, target: connection.target, conditionType: null },
				`manual-${connection.source}-${connection.target}`
			)
			commitEdges(addEdge(edge, edgesRef.current))
		},
		[commitEdges]
	)

	const onReconnect = useCallback<OnReconnect<WorkflowEdgeType>>(
		(edge, connection) => {
			if (!isWorkflowConnectionValid(connection, nodesRef.current, edgesRef.current, edge.id)) return
			commitEdges(reconnectEdge(edge, connection, edgesRef.current))
		},
		[commitEdges]
	)

	const onReconnectStart = useCallback((_event: ReactMouseEvent, edge: WorkflowEdgeType) => {
		reconnectingEdgeIdRef.current = edge.id
	}, [])

	const onReconnectEnd = useCallback(() => {
		reconnectingEdgeIdRef.current = null
	}, [])

	const onNodeDragStop = useCallback<OnNodeDrag<WorkflowNodeType>>(
		(_event, node) => onNodePositionCommit(node.id, node.position),
		[onNodePositionCommit]
	)

	const flowRef = useRef<CanvasFlowPositioner | null>(null)
	const canvasElementRef = useRef<HTMLDivElement | null>(null)

	const setCanvasElement = useCallback((element: HTMLDivElement | null) => {
		canvasElementRef.current = element
	}, [])

	const onInit = useCallback((instance: CanvasFlowPositioner) => {
		flowRef.current = instance
	}, [])

	/**
	 * 카탈로그 항목으로 새 노드를 만들어 지금 보이는 화면 가운데에 붙이고 `onNodeAdd`로 편집 문서에 반영한다.
	 * ReactFlow가 초기화되기 전(`onInit` 전)이거나 캔버스 요소가 없으면 아무것도 하지 않는다.
	 */
	const addCatalogNode = useCallback(
		(entry: NodeCatalogEntry) => {
			const flow = flowRef.current
			const rect = canvasElementRef.current?.getBoundingClientRect()
			if (!flow || !rect) return
			const viewportCenter = flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
			const position = placeNewNode(viewportCenter, nodesRef.current.map(getNodeRect))
			const node = createWorkflowNodeFromCatalogEntry(entry, position, crypto.randomUUID())
			// 표시용 data는 문서에서 다시 계산한 nodes prop 값을 쓰므로 여기서는 캔버스 노드 뼈대만 맞춘다.
			const [canvasNode] = toWorkflowCanvasNodes([node], new Map(), false)
			// 캔버스를 다시 마운트하지 않고 노드를 붙여 보던 화면 위치를 유지한다.
			const nextNodes = [...nodesRef.current, canvasNode]
			nodesRef.current = nextNodes
			setNodes(nextNodes)
			onNodeAdd(node)
		},
		[onNodeAdd, setNodes]
	)

	return {
		nodes,
		edges,
		onNodesChange,
		onEdgesChange,
		onConnect,
		onReconnect,
		onReconnectStart,
		onReconnectEnd,
		onNodeDragStop,
		isValidConnection,
		setCanvasElement,
		onInit,
		addCatalogNode,
	}
}
