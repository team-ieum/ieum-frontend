import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type NodeChange,
} from '@xyflow/react'
import { useCallback, useState } from 'react'
import type { WorkflowNodeType } from '@/types/workflow'

export const useWorkflowEditor = (initialNodes: WorkflowNodeType[] = [], initialEdges: Edge[] = []) => {
	const [nodes, setNodes] = useState<WorkflowNodeType[]>(initialNodes)
	const [edges, setEdges] = useState<Edge[]>(initialEdges)

	const onNodesChange = useCallback(
		(changes: NodeChange<WorkflowNodeType>[]) => setNodes(nds => applyNodeChanges(changes, nds)),
		[]
	)

	const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)), [])

	const onConnect = useCallback(
		(connection: Connection) => setEdges(eds => addEdge({ ...connection, style: { stroke: '#007ba7' } }, eds)),
		[]
	)

	return { nodes, edges, onNodesChange, onEdgesChange, onConnect }
}
