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

const INITIAL_NODES: WorkflowNodeType[] = [
	{
		id: 'webhook',
		type: 'workflowNode',
		position: { x: 50, y: 80 },
		data: { brand: 'webhook', title: 'Watch Webhook', method: 'POST', url: '/hook/a1b2c3' },
	},
	{
		id: 'gpt',
		type: 'workflowNode',
		position: { x: 50, y: 260 },
		data: { brand: 'openai', title: 'GPT-4 · Classify', method: 'POST', url: '/v1/chat/completions' },
	},
	{
		id: 'filter',
		type: 'workflowNode',
		position: { x: 50, y: 440 },
		data: { brand: 'filter', title: 'If priority = high', method: 'IF', url: 'priority == "high"' },
	},
	{
		id: 'slack',
		type: 'workflowNode',
		position: { x: 420, y: 170 },
		data: { brand: 'slack', title: 'Post to #support', method: 'POST', url: '/api/chat.postMessage', check: true },
	},
	{
		id: 'notion',
		type: 'workflowNode',
		position: { x: 420, y: 350 },
		data: { brand: 'notion', title: 'Create DB row', method: 'POST', url: '/v1/pages', check: true },
	},
	{
		id: 'fallback',
		type: 'workflowNode',
		position: { x: 420, y: 530 },
		data: { brand: 'warning', title: 'Fallback Email', method: 'POST', url: '/v1/email/send', warn: true },
	},
]

const INITIAL_EDGES: Edge[] = [
	{ id: 'e1', source: 'webhook', target: 'gpt', style: { stroke: '#007ba7' } },
	{ id: 'e2', source: 'gpt', target: 'filter', style: { stroke: '#007ba7' } },
	{ id: 'e3', source: 'gpt', target: 'slack', animated: true, style: { stroke: '#007ba7' } },
	{ id: 'e4', source: 'filter', target: 'notion', style: { stroke: '#007ba7' } },
	{ id: 'e5', source: 'filter', target: 'fallback', style: { stroke: '#007ba7' } },
]

export const useWorkflowEditor = () => {
	const [nodes, setNodes] = useState<WorkflowNodeType[]>(INITIAL_NODES)
	const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES)

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
