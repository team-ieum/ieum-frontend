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

	// 채팅 등으로 캔버스가 갱신될 때 기존 노드 위치는 유지하고 신규 노드만 추가한다.
	// 신규 노드 id만 새로 mount되어 등장 애니메이션이 실행된다(기존 노드는 재애니 없음).
	const syncCanvas = useCallback((nextNodes: WorkflowNodeType[], nextEdges: Edge[]) => {
		setNodes(prev => {
			const prevById = new Map(prev.map(n => [n.id, n]))
			return nextNodes.map(n => {
				const existing = prevById.get(n.id)
				return existing ? { ...n, position: existing.position } : n
			})
		})
		setEdges(nextEdges)
	}, [])

	return { nodes, edges, onNodesChange, onEdgesChange, onConnect, syncCanvas }
}
