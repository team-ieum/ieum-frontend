import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useParams } from 'react-router'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import { useWorkflowEditor } from '@/hooks/workflow/useWorkflowEditor'
import { useWorkflowQuery } from '@/hooks/workflow/queries/useWorkflowQuery'
import type { WorkflowDto, WorkflowNodeDto, WorkflowEdgeDto } from '@/types/workflowList'
import type { WorkflowNodeType } from '@/types/workflow'

const nodeTypes = { workflowNode: WorkflowNode }

const toReactFlowNode = (dto: WorkflowNodeDto, index: number): WorkflowNodeType => ({
	id: dto.id,
	type: 'workflowNode',
	position: { x: index * 300, y: 100 },
	data: {
		brand: (dto.config.brand as WorkflowNodeType['data']['brand']) ?? 'webhook',
		title: dto.label,
		method: (dto.config.method as string) ?? '',
		url: (dto.config.url as string) ?? '',
	},
})

const toReactFlowEdge = (dto: WorkflowEdgeDto): Edge => ({
	id: `${dto.source}-${dto.target}`,
	source: dto.source,
	target: dto.target,
	style: { stroke: '#007ba7' },
})

type WorkflowCanvasProps = {
	initialNodes: WorkflowNodeType[]
	initialEdges: Edge[]
}

const WorkflowCanvas = ({ initialNodes, initialEdges }: WorkflowCanvasProps) => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useWorkflowEditor(initialNodes, initialEdges)

	return (
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
			<Background variant={BackgroundVariant.Dots} gap={18} size={3} color='rgba(125,140,196,.25)' />
			<Controls />
			<MiniMap />
		</ReactFlow>
	)
}

const toCanvasData = (workflow: WorkflowDto) => ({
	nodes: workflow.nodes.map((n, i) => toReactFlowNode(n, i)),
	edges: workflow.edges.map(toReactFlowEdge),
})

const WorkFlowPage = () => {
	const { workflowId } = useParams<{ workflowId: string }>()
	const { data } = useWorkflowQuery(workflowId)
	const workflow = data?.data
	const canvas = workflow ? toCanvasData(workflow) : null

	return (
		<div className='-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col' style={{ height: 'calc(100vh - var(--layout-header-height))' }}>
			<WorkflowToolbar
				defaultTitle={workflow?.name}
				status={workflow ? (workflow.active ? 'active' : 'paused') : undefined}
			/>
			<div className='relative flex-1'>
				<style>{`.react-flow__edge.selected .react-flow__edge-path { stroke-width: 3px !important; }`}</style>
				{canvas && <WorkflowCanvas key={workflowId} initialNodes={canvas.nodes} initialEdges={canvas.edges} />}
				<WorkflowChat />
			</div>
		</div>
	)
}

export default WorkFlowPage
