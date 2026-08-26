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
	useEdgesState,
	useNodesState,
} from '@xyflow/react'
import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import { createWorkflowCanvasEdge } from '@/utils/workflow/mapWorkflowCanvas'
import { isWorkflowConnectionValid } from '@/utils/workflow/workflowConnection'

type UseWorkflowCanvasEditorOptions = {
	initialNodes: WorkflowNodeType[]
	initialEdges: WorkflowEdgeType[]
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
}

export const useWorkflowCanvasEditor = ({
	initialNodes,
	initialEdges,
	onNodePositionCommit,
	onEdgesCommit,
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
	}
}
