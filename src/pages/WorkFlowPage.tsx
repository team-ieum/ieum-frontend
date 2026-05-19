import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import { useWorkflowEditor } from '@/hooks/workflow/useWorkflowEditor'

const nodeTypes = { workflowNode: WorkflowNode }

const WorkFlowPage = () => {
	const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useWorkflowEditor()

	return (
		<div className='-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col' style={{ height: 'calc(100vh - var(--layout-header-height))' }}>
			<WorkflowToolbar defaultTitle='Lead Qualification Engine' />
			<div className='relative flex-1'>
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
				<WorkflowChat />
			</div>
		</div>
	)
}

export default WorkFlowPage
