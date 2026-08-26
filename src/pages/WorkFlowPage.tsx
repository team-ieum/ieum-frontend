import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import '@/styles/react-flow.css'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import AnimatedEdge from '@/components/workflow/AnimatedEdge'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import { useProvidersQuery } from '@/hooks/aiCredentials/queries/useProvidersQuery'
import { useToggleWorkflowMutation } from '@/hooks/workflow/mutations/useToggleWorkflowMutation'
import { useWorkflowQuery } from '@/hooks/workflow/queries/useWorkflowQuery'
import { useWorkflowCanvasEditor } from '@/hooks/workflow/useWorkflowCanvasEditor'
import { useWorkflowExecution } from '@/hooks/workflow/useWorkflowExecution'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useModalStore } from '@/stores/useModalStore'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import { isApiError } from '@/utils/ApiError'
import { cn } from '@/utils/cn'
import {
	createModelNameMap,
	isWorkflowEdgeDto,
	isWorkflowNodeDto,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
	toWorkflowEdgeDtos,
	toWorkflowNodeStatus,
} from '@/utils/workflow/mapWorkflowCanvas'
import {
	isSameWorkflowDraft,
	readWorkflowDraft,
	removeWorkflowDraft,
	type WorkflowDraftData,
	writeWorkflowDraft,
} from '@/utils/workflow/workflowDraftStorage'

const nodeTypes = { workflowNode: WorkflowNode }
const edgeTypes = { animated: AnimatedEdge }

const WORKFLOW_CANVAS_CLASS = cn(
	'bg-[#f7f6fc]',
	'[&_.react-flow__controls]:overflow-hidden [&_.react-flow__controls]:rounded-[0.7rem]',
	'[&_.react-flow__controls]:border [&_.react-flow__controls]:border-[#d8e3e7]',
	'[&_.react-flow__controls]:shadow-[0_8px_20px_rgba(43,72,86,0.09)]',
	'[&_.react-flow__controls-button]:size-8 [&_.react-flow__controls-button]:border-b-[#e5ecef]',
	'[&_.react-flow__minimap]:rounded-xl [&_.react-flow__minimap]:border [&_.react-flow__minimap]:border-[#d8e3e7]',
	'[&_.react-flow__minimap]:bg-white/90 [&_.react-flow__minimap]:shadow-[0_8px_20px_rgba(43,72,86,0.08)]',
	'[&_.react-flow__edge.selected_.react-flow__edge-path]:stroke-[2px]',
	'max-[560px]:[&_.react-flow__minimap]:hidden'
)

type WorkflowCanvasProps = {
	nodes: WorkflowNodeType[]
	edges: WorkflowEdgeType[]
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
}

const WorkflowCanvas = ({ nodes, edges, onNodePositionCommit, onEdgesCommit }: WorkflowCanvasProps) => {
	const nodeStatus = useExecutionStore(state => state.nodeStatus)
	const editor = useWorkflowCanvasEditor({ initialNodes: nodes, initialEdges: edges, onNodePositionCommit, onEdgesCommit })
	const nodePresentation = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
	const displayNodes = useMemo(
		() =>
			editor.nodes.map(node => {
				const presentation = nodePresentation.get(node.id)
				return {
					...node,
					data: {
						...(presentation?.data ?? node.data),
						status: toWorkflowNodeStatus(nodeStatus[node.id]),
					},
				}
			}),
		[editor.nodes, nodePresentation, nodeStatus]
	)
	const displayEdges = useMemo(
		() =>
			editor.edges.map(edge => ({
				...edge,
				data: { ...edge.data, flowing: nodeStatus[edge.target] === 'running' },
			})),
		[editor.edges, nodeStatus]
	)

	return (
		<ReactFlow
			className={WORKFLOW_CANVAS_CLASS}
			nodes={displayNodes}
			edges={displayEdges}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			onNodesChange={editor.onNodesChange}
			onEdgesChange={editor.onEdgesChange}
			onNodeDragStop={editor.onNodeDragStop}
			onConnect={editor.onConnect}
			onReconnect={editor.onReconnect}
			onReconnectStart={editor.onReconnectStart}
			onReconnectEnd={editor.onReconnectEnd}
			isValidConnection={editor.isValidConnection}
			nodesDraggable
			nodesConnectable
			edgesReconnectable
			elementsSelectable
			panOnDrag
			deleteKeyCode={['Backspace', 'Delete']}
			fitView
			fitViewOptions={{ padding: 0.24, minZoom: 0.78, maxZoom: 1 }}
			minZoom={0.5}
			maxZoom={1.4}
			proOptions={{ hideAttribution: true }}
		>
			<Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color='rgba(74, 101, 124, 0.18)' />
			<Controls showInteractive={false} />
			<MiniMap pannable zoomable nodeStrokeWidth={3} />
		</ReactFlow>
	)
}

type WorkflowEditorSession = {
	key: string
	document: WorkflowDraftData
	isDraftPersisted: boolean
	canvasRevision: number
}

const WorkFlowPage = () => {
	const { workflowId } = useParams<{ workflowId: string }>()
	const { data } = useWorkflowQuery(workflowId)
	const { data: providersData } = useProvidersQuery()
	const workflow = data?.data
	const [technicalMode, setTechnicalMode] = useState(false)
	const [editorSession, setEditorSession] = useState<WorkflowEditorSession | null>(null)

	const serverDocument = useMemo<WorkflowDraftData | null>(() => {
		if (!workflow) return null
		const nodes = workflow.nodes.filter(isWorkflowNodeDto)
		const nodeIds = new Set(nodes.map(node => node.id))
		const edges = workflow.edges
			.filter(isWorkflowEdgeDto)
			.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
		return { title: workflow.name, nodes, edges }
	}, [workflow])

	const editorKey = workflow ? `${workflow.id}:${workflow.version}` : ''
	if (workflow && serverDocument && editorSession?.key !== editorKey) {
		const draft = readWorkflowDraft(workflow.id, workflow.version)
		const draftDocument = draft ? { title: draft.title, nodes: draft.nodes, edges: draft.edges } : null
		const hasDraftChanges = Boolean(draftDocument && !isSameWorkflowDraft(draftDocument, serverDocument))
		if (draftDocument && !hasDraftChanges) removeWorkflowDraft(workflow.id)
		setEditorSession({
			key: editorKey,
			document: hasDraftChanges && draftDocument ? draftDocument : serverDocument,
			isDraftPersisted: hasDraftChanges,
			canvasRevision: 0,
		})
	}

	const document = editorSession?.key === editorKey ? editorSession.document : serverDocument
	const hasUnsavedChanges = Boolean(document && serverDocument && !isSameWorkflowDraft(document, serverDocument))
	const modelNames = useMemo(() => createModelNameMap(providersData?.data.providers), [providersData?.data.providers])
	const canvas = useMemo(() => {
		if (!document) return null
		return {
			nodes: toWorkflowCanvasNodes(document.nodes, modelNames, technicalMode),
			edges: toWorkflowCanvasEdges(document.edges),
		}
	}, [document, modelNames, technicalMode])

	const commitDocument = useCallback(
		(nextDocument: WorkflowDraftData, remountCanvas = false) => {
			if (!workflow || !serverDocument) return
			const dirty = !isSameWorkflowDraft(nextDocument, serverDocument)
			const isDraftPersisted = dirty
				? writeWorkflowDraft(workflow.id, workflow.version, nextDocument)
				: (removeWorkflowDraft(workflow.id), false)

			setEditorSession(current => {
				if (!current || current.key !== editorKey) return current
				return {
					...current,
					document: nextDocument,
					isDraftPersisted,
					canvasRevision: remountCanvas ? current.canvasRevision + 1 : current.canvasRevision,
				}
			})
		},
		[editorKey, serverDocument, workflow]
	)

	const handleTitleChange = useCallback(
		(title: string) => {
			if (!document) return
			commitDocument({ ...document, title })
		},
		[commitDocument, document]
	)

	const handleNodePositionCommit = useCallback(
		(nodeId: string, position: { x: number; y: number }) => {
			if (!document) return
			commitDocument({
				...document,
				nodes: document.nodes.map(node => (node.id === nodeId ? { ...node, position } : node)),
			})
		},
		[commitDocument, document]
	)

	const handleEdgesCommit = useCallback(
		(edges: WorkflowEdgeType[]) => {
			if (!document) return
			commitDocument({ ...document, edges: toWorkflowEdgeDtos(edges) })
		},
		[commitDocument, document]
	)

	const handleCanvasUpdate = useCallback(
		(rawNodes: unknown[], rawEdges: unknown[]) => {
			if (!document) return
			const previousPositions = new Map(document.nodes.map(node => [node.id, node.position]))
			const nodes = rawNodes.filter(isWorkflowNodeDto).map(node => {
				const position = previousPositions.get(node.id)
				return position ? { ...node, position } : node
			})
			const nodeIds = new Set(nodes.map(node => node.id))
			const edges = rawEdges.filter(isWorkflowEdgeDto).filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
			commitDocument({ ...document, nodes, edges }, true)
		},
		[commitDocument, document]
	)

	const openModal = useModalStore(state => state.open)
	const toggleMutation = useToggleWorkflowMutation(workflowId ?? '')
	const { execute, isExecuting } = useWorkflowExecution(workflowId ?? '')

	const handleExecute = async () => {
		try {
			await execute()
		} catch (error) {
			openModal('실행 오류', isApiError(error) ? error.message : '워크플로우 실행에 실패했어요. 다시 시도해주세요.')
		}
	}

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
				title={document?.title ?? workflow?.name ?? '워크플로우 제목'}
				onTitleChange={handleTitleChange}
				hasUnsavedChanges={hasUnsavedChanges}
				isDraftPersisted={Boolean(hasUnsavedChanges && editorSession?.isDraftPersisted)}
				status={active === undefined ? undefined : active ? 'active' : 'paused'}
				active={active}
				onToggleActive={handleToggleActive}
				onExecute={handleExecute}
				isExecuting={isExecuting}
				technicalMode={technicalMode}
				onToggleTechnicalMode={() => setTechnicalMode(enabled => !enabled)}
			/>
			<div className='relative flex-1'>
				{canvas && editorSession ? (
					<WorkflowCanvas
						key={`${editorSession.key}:${editorSession.canvasRevision}`}
						nodes={canvas.nodes}
						edges={canvas.edges}
						onNodePositionCommit={handleNodePositionCommit}
						onEdgesCommit={handleEdgesCommit}
					/>
				) : null}
				<WorkflowChat
					workflowId={workflowId ?? ''}
					currentNodes={document?.nodes ?? []}
					currentEdges={document?.edges ?? []}
					onCanvasUpdate={handleCanvasUpdate}
				/>
			</div>
		</div>
	)
}

export default WorkFlowPage
