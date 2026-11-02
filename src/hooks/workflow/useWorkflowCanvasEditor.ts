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
import { useReducedMotion } from 'framer-motion'
import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { createWorkflowCanvasEdge, toWorkflowCanvasNodes } from '@/utils/workflow/mapWorkflowCanvas'
import { createWorkflowNodeFromCatalogEntry } from '@/utils/workflow/nodeCatalog'
import { getNodeRect, placeNewNode, placeNextNode } from '@/utils/workflow/placeNewNode'
import { isWorkflowConnectionValid } from '@/utils/workflow/workflowConnection'

// 노드 배치에는 좌표 변환과 화면 이동만 쓰므로, 표시용 노드 타입이 다른 ReactFlow 인스턴스도 받을 수 있게 필요한 메서드만 요구한다.
type CanvasFlowPositioner = Pick<ReactFlowInstance, 'screenToFlowPosition' | 'setCenter' | 'getZoom'>

type UseWorkflowCanvasEditorOptions = {
	initialNodes: WorkflowNodeType[]
	initialEdges: WorkflowEdgeType[]
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
	/**
	 * 캔버스에서 새로 만든 노드를 편집 문서에 반영한다. 연결도 함께 만들었으면 `edges`에 캔버스의 최신 연결 목록을 넘긴다.
	 * 노드와 연결을 따로 커밋하면 두 번째 커밋이 같은 렌더의 문서를 다시 써 방금 넣은 노드를 잃으므로 한 번에 받는다.
	 */
	onNodeAdd: (node: WorkflowNodeDto, edges?: WorkflowEdgeType[]) => void
	/**
	 * 캔버스에서 지운 노드를 편집 문서에 반영한다. `edges`는 지운 노드에 닿은 연결을 뺀 캔버스의 최신 연결 목록이다.
	 * ReactFlow는 같은 삭제 이벤트에서 연결 remove를 먼저 보내 `onEdgesCommit`이 이미 불렸을 수 있으므로,
	 * 받는 쪽은 이전 렌더의 연결 목록이 아니라 이 `edges`로 문서를 덮어써야 앞선 연결 삭제를 잃지 않는다.
	 */
	onNodesRemove: (nodeIds: string[], edges: WorkflowEdgeType[]) => void
}

export const useWorkflowCanvasEditor = ({
	initialNodes,
	initialEdges,
	onNodePositionCommit,
	onEdgesCommit,
	onNodeAdd,
	onNodesRemove,
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

			const removedNodeIds = new Set(changes.flatMap(change => (change.type === 'remove' ? [change.id] : [])))
			if (removedNodeIds.size === 0) return
			// 연결 remove 없이 노드만 지워지는 경로에서도 문서에 끊긴 연결이 남지 않게 한 번 더 거른다.
			const nextEdges = edgesRef.current.filter(
				edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
			)
			if (nextEdges.length !== edgesRef.current.length) {
				edgesRef.current = nextEdges
				setEdges(nextEdges)
			}
			onNodesRemove([...removedNodeIds], nextEdges)
		},
		[onNodesRemove, setEdges, setNodes]
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

	const reduceMotion = useReducedMotion()

	// 캔버스를 다시 마운트하지 않고 노드를 붙여 보던 화면 위치를 유지한다.
	const appendCanvasNode = useCallback(
		(node: WorkflowNodeDto) => {
			// 표시용 data는 문서에서 다시 계산한 nodes prop 값을 쓰므로 여기서는 캔버스 노드 뼈대만 맞춘다.
			const [canvasNode] = toWorkflowCanvasNodes([node], new Map(), false)
			const nextNodes = [...nodesRef.current, canvasNode]
			nodesRef.current = nextNodes
			setNodes(nextNodes)
		},
		[setNodes]
	)

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
			appendCanvasNode(node)
			onNodeAdd(node)
		},
		[appendCanvasNode, onNodeAdd]
	)

	/**
	 * 카탈로그 항목으로 만든 노드를 `sourceNodeId` 노드 오른쪽에 붙이고 `원래 → 새 노드`로 연결한다. 원래 노드의 다른 연결은 그대로 둔다.
	 * 고르는 사이 원래 노드가 지워졌으면 `addCatalogNode`처럼 화면 가운데에 연결 없이 붙인다. 새 노드가 화면 밖이면 그쪽으로 화면을 옮긴다.
	 */
	const addNextCatalogNode = useCallback(
		(sourceNodeId: string, entry: NodeCatalogEntry) => {
			const source = nodesRef.current.find(node => node.id === sourceNodeId)
			if (!source) {
				addCatalogNode(entry)
				return
			}
			const flow = flowRef.current
			const rect = canvasElementRef.current?.getBoundingClientRect()
			if (!flow || !rect) return
			const position = placeNextNode(getNodeRect(source), nodesRef.current.map(getNodeRect))
			const node = createWorkflowNodeFromCatalogEntry(entry, position, crypto.randomUUID())
			appendCanvasNode(node)

			const connection = { source: sourceNodeId, target: node.id }
			if (isWorkflowConnectionValid(connection, nodesRef.current, edgesRef.current)) {
				const edge = createWorkflowCanvasEdge(
					{ ...connection, conditionType: null },
					`manual-${connection.source}-${connection.target}`
				)
				const nextEdges = addEdge(edge, edgesRef.current)
				edgesRef.current = nextEdges
				setEdges(nextEdges)
				onNodeAdd(node, nextEdges)
			} else {
				onNodeAdd(node)
			}

			const nodeRect = getNodeRect({ position })
			const visibleStart = flow.screenToFlowPosition({ x: rect.left, y: rect.top })
			const visibleEnd = flow.screenToFlowPosition({ x: rect.right, y: rect.bottom })
			const isVisible =
				nodeRect.x >= visibleStart.x &&
				nodeRect.y >= visibleStart.y &&
				nodeRect.x + nodeRect.width <= visibleEnd.x &&
				nodeRect.y + nodeRect.height <= visibleEnd.y
			if (!isVisible) {
				void flow.setCenter(nodeRect.x + nodeRect.width / 2, nodeRect.y + nodeRect.height / 2, {
					zoom: flow.getZoom(),
					duration: reduceMotion ? 0 : 200,
				})
			}
		},
		[addCatalogNode, appendCanvasNode, onNodeAdd, reduceMotion, setEdges]
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
		addNextCatalogNode,
	}
}
