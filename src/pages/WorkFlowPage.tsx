import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useState } from 'react'
import { useParams } from 'react-router'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import { useWorkflowEditor } from '@/hooks/workflow/useWorkflowEditor'
import { useWorkflowQuery } from '@/hooks/workflow/queries/useWorkflowQuery'
import { useToggleWorkflowMutation } from '@/hooks/workflow/mutations/useToggleWorkflowMutation'
import { useExecuteWorkflowMutation } from '@/hooks/workflow/mutations/useExecuteWorkflowMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import type { WorkflowDto, WorkflowNodeDto, WorkflowEdgeDto } from '@/types/workflowList'
import type { WorkflowNodeType } from '@/types/workflow'

const nodeTypes = { workflowNode: WorkflowNode }

const toReactFlowNode = (dto: WorkflowNodeDto, index: number): WorkflowNodeType => ({
	id: dto.id,
	type: 'workflowNode',
	position: { x: index * 300, y: 100 },
	data: {
		brand: (dto.config?.brand as WorkflowNodeType['data']['brand']) ?? 'webhook',
		title: dto.label,
		method: (dto.config?.method as string) ?? '',
		url: (dto.config?.url as string) ?? '',
	},
})

const isValidRawNode = (n: unknown): n is WorkflowNodeDto => typeof n === 'object' && n !== null && 'id' in n && 'label' in n

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

	const openModal = useModalStore(state => state.open)
	const toggleMutation = useToggleWorkflowMutation(workflowId ?? '')
	const executeMutation = useExecuteWorkflowMutation(workflowId ?? '')

	const handleExecute = async () => {
		try {
			await executeMutation.mutateAsync()
		} catch (error) {
			openModal('실행 오류', isApiError(error) ? error.message : '워크플로우 실행에 실패했어요. 다시 시도해주세요.')
		}
	}

	const [aiCanvasVersion, setAiCanvasVersion] = useState(0)
	const [aiCanvas, setAiCanvas] = useState<{ nodes: WorkflowNodeType[]; edges: Edge[] } | null>(null)
	const [aiRawCanvas, setAiRawCanvas] = useState<{ nodes: unknown[]; edges: unknown[] } | null>(null)

	const handleCanvasUpdate = (rawNodes: unknown[], rawEdges: unknown[]) => {
		const nodes = rawNodes.filter(isValidRawNode).map((n, i) => toReactFlowNode(n, i))
		const edges = (rawEdges as WorkflowEdgeDto[]).map(toReactFlowEdge)
		setAiCanvas({ nodes, edges })
		setAiRawCanvas({ nodes: rawNodes, edges: rawEdges })
		setAiCanvasVersion(v => v + 1)
	}

	// undefined = API 데이터 우선, boolean = 사용자가 토글한 로컬 override
	const [localActive, setLocalActive] = useState<boolean | undefined>(undefined)
	const active = localActive ?? workflow?.active

	const handleToggleActive = async () => {
		const next = !(active ?? false)
		setLocalActive(next)
		try {
			await toggleMutation.mutateAsync(next)
			setLocalActive(undefined)
		} catch (error) {
			setLocalActive(undefined)
			openModal('오류', isApiError(error) ? error.message : '상태 변경에 실패했어요. 다시 시도해주세요.')
		}
	}

	return (
		<div className='-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col' style={{ height: 'calc(100vh - var(--layout-header-height))' }}>
			<WorkflowToolbar
				defaultTitle={workflow?.name}
				status={active === undefined ? undefined : active ? 'active' : 'paused'}
				active={active}
				onToggleActive={handleToggleActive}
				onExecute={handleExecute}
			/>
			<div className='relative flex-1'>
				<style>{`.react-flow__edge.selected .react-flow__edge-path { stroke-width: 3px !important; }`}</style>
				{(aiCanvas ?? canvas) && (
					<WorkflowCanvas
						key={`${workflowId}-${aiCanvasVersion}`}
						initialNodes={(aiCanvas ?? canvas)!.nodes}
						initialEdges={(aiCanvas ?? canvas)!.edges}
					/>
				)}
				<WorkflowChat
					workflowId={workflowId ?? ''}
					currentNodes={aiRawCanvas?.nodes ?? workflow?.nodes ?? []}
					currentEdges={aiRawCanvas?.edges ?? workflow?.edges ?? []}
					onCanvasUpdate={handleCanvasUpdate}
				/>
			</div>
		</div>
	)
}

export default WorkFlowPage
