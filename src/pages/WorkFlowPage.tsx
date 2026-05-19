import {
	Background,
	BackgroundVariant,
	Controls,
	MiniMap,
	ReactFlow,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type Edge,
	type EdgeChange,
	type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useState } from 'react'
import WorkflowNode, { type WorkflowNodeType } from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'

const nodeTypes = { workflowNode: WorkflowNode }

const initialNodes: WorkflowNodeType[] = [
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
		data: {
			brand: 'openai',
			title: 'GPT-4 · Classify',
			method: 'POST',
			url: '/v1/chat/completions',
		},
	},
	{
		id: 'filter',
		type: 'workflowNode',
		position: { x: 50, y: 440 },
		data: {
			brand: 'filter',
			title: 'If priority = high',
			method: 'IF',
			url: 'priority == "high"',
		},
	},
	{
		id: 'slack',
		type: 'workflowNode',
		position: { x: 420, y: 170 },
		data: {
			brand: 'slack',
			title: 'Post to #support',
			method: 'POST',
			url: '/api/chat.postMessage',
			check: true,
		},
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
		data: {
			brand: 'warning',
			title: 'Fallback Email',
			method: 'POST',
			url: '/v1/email/send',
			warn: true,
		},
	},
]

const initialEdges: Edge[] = [
	{ id: 'e1', source: 'webhook', target: 'gpt', style: { stroke: '#007ba7' } },
	{ id: 'e2', source: 'gpt', target: 'filter', style: { stroke: '#007ba7' } },
	{
		id: 'e3',
		source: 'gpt',
		target: 'slack',
		animated: true,
		style: { stroke: '#007ba7' },
	},
	{ id: 'e4', source: 'filter', target: 'notion', style: { stroke: '#007ba7' } },
	{ id: 'e5', source: 'filter', target: 'fallback', style: { stroke: '#007ba7' } },
]

const WorkFlowPage = () => {
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

	return (
		<div className='-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col' style={{ height: 'calc(100vh - var(--layout-header-height))' }}>
			<WorkflowToolbar defaultTitle='Lead Qualification Engine' />
			<style>{`.react-flow__edge.selected .react-flow__edge-path { stroke-width: 3px !important; }`}</style>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				fitView
				fitViewOptions={{ padding: 0.2 }}
			>
				<Background variant={BackgroundVariant.Dots} gap={18} size={1} color='rgba(125,140,196,.25)' />
				<Controls />
				<MiniMap />
			</ReactFlow>
		</div>
	)
}

export default WorkFlowPage
