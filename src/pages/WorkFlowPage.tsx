import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, type ReactFlowInstance } from '@xyflow/react'
import '@/styles/react-flow.css'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AnimatedEdge from '@/components/workflow/AnimatedEdge'
import NodeCatalogPalette from '@/components/workflow/NodeCatalogPalette'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import { WorkflowDetailError, WorkflowDetailSkeleton } from '@/components/workflow/WorkflowDetailAsyncState'
import { useProvidersQuery } from '@/hooks/aiCredentials/queries/useProvidersQuery'
import { useToggleWorkflowMutation } from '@/hooks/workflow/mutations/useToggleWorkflowMutation'
import { useNodeCatalogQuery } from '@/hooks/workflow/queries/useNodeCatalogQuery'
import { useWorkflowQuery } from '@/hooks/workflow/queries/useWorkflowQuery'
import { useWorkflowCanvasEditor } from '@/hooks/workflow/useWorkflowCanvasEditor'
import { useWorkflowEditorViewModel } from '@/hooks/workflow/useWorkflowEditorViewModel'
import { useWorkflowExecution } from '@/hooks/workflow/useWorkflowExecution'
import { useWorkflowSave } from '@/hooks/workflow/useWorkflowSave'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useModalStore } from '@/stores/useModalStore'
import type { ApiErrorCode } from '@/types/api'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeExecutionStatus } from '@/types/workflowExecution'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { isApiError } from '@/utils/ApiError'
import { cn } from '@/utils/cn'
import {
	createModelNameMap,
	normalizeWorkflowCanvasDocument,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
	toWorkflowNodeStatus,
} from '@/utils/workflow/mapWorkflowCanvas'
import { createWorkflowNodeFromCatalogEntry } from '@/utils/workflow/nodeCatalog'
import { getNodeRect, placeNewNode } from '@/utils/workflow/placeNewNode'
import type { WorkflowDraftData } from '@/utils/workflow/workflowDraftStorage'

const nodeTypes = { workflowNode: WorkflowNode }
const edgeTypes = { animated: AnimatedEdge }
const workflowNotFoundCodes: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
	'WORKFLOW_NOT_FOUND',
	'WORKFLOW_DEFINITION_NOT_FOUND',
	'NOT_FOUND',
])

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
	nodeStatus: Record<string, NodeExecutionStatus>
	isTracking: boolean
	isPaletteOpen: boolean
	onPaletteClose: () => void
	onNodeAdd: (node: WorkflowNodeDto) => void
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
}

const WorkflowCanvas = ({
	nodes,
	edges,
	nodeStatus,
	isTracking,
	isPaletteOpen,
	onPaletteClose,
	onNodeAdd,
	onNodePositionCommit,
	onEdgesCommit,
}: WorkflowCanvasProps) => {
	const editor = useWorkflowCanvasEditor({ initialNodes: nodes, initialEdges: edges, onNodePositionCommit, onEdgesCommit })
	const [flow, setFlow] = useState<ReactFlowInstance<WorkflowNodeType, WorkflowEdgeType> | null>(null)
	const canvasRef = useRef<HTMLDivElement>(null)

	const handleCatalogSelect = (entry: NodeCatalogEntry) => {
		const rect = canvasRef.current?.getBoundingClientRect()
		if (!flow || !rect) return
		const viewportCenter = flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
		const position = placeNewNode(viewportCenter, editor.nodes.map(getNodeRect))
		const node = createWorkflowNodeFromCatalogEntry(entry, position)
		// 표시용 data는 문서에서 다시 계산한 nodes prop 값을 쓰므로 여기서는 캔버스 노드 뼈대만 맞춘다.
		const [canvasNode] = toWorkflowCanvasNodes([node], new Map(), false)
		editor.addNode(canvasNode)
		onNodeAdd(node)
		onPaletteClose()
	}
	const nodePresentation = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
	const displayNodes = useMemo(
		() =>
			editor.nodes.map(node => {
				const presentation = nodePresentation.get(node.id)
				return {
					...node,
					data: {
						...(presentation?.data ?? node.data),
						status:
							nodeStatus[node.id] === 'running' && !isTracking
								? 'interrupted'
								: toWorkflowNodeStatus(nodeStatus[node.id]),
					},
				}
			}),
		[editor.nodes, nodePresentation, nodeStatus, isTracking]
	)
	const displayEdges = useMemo(
		() =>
			editor.edges.map(edge => ({
				...edge,
				data: { ...edge.data, flowing: isTracking && nodeStatus[edge.target] === 'running' },
			})),
		[editor.edges, nodeStatus, isTracking]
	)

	return (
		<>
			<ReactFlow
				ref={canvasRef}
				onInit={setFlow}
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
			{isPaletteOpen ? <NodeCatalogPalette onSelect={handleCatalogSelect} onClose={onPaletteClose} /> : null}
		</>
	)
}

const WorkFlowPage = () => {
	const { workflowId } = useParams<{ workflowId: string }>()
	const navigate = useNavigate()
	const workflowQuery = useWorkflowQuery(workflowId)
	const { data } = workflowQuery
	const { data: providersData } = useProvidersQuery()
	const workflow = data?.data
	const [technicalMode, setTechnicalMode] = useState(false)
	const [isPaletteOpen, setIsPaletteOpen] = useState(false)
	const paletteButtonRef = useRef<HTMLButtonElement>(null)
	// 팔레트는 열릴 때 패널로 포커스를 가져가므로 닫힐 때 여는 버튼으로 돌려줘야 키보드 위치를 잃지 않는다.
	const closePalette = () => {
		setIsPaletteOpen(false)
		paletteButtonRef.current?.focus()
	}
	const { data: catalogData } = useNodeCatalogQuery()
	// 카탈로그를 받기 전에는 판정하지 않아 정상 노드가 '지원하지 않는 작업'으로 보이지 않게 한다.
	const catalogEvents = useMemo(
		() => (catalogData ? new Set(catalogData.data.entries.map(entry => entry.id)) : undefined),
		[catalogData]
	)

	const serverDocument = useMemo<WorkflowDraftData | null>(() => {
		if (!workflow) return null
		const canvasDocument = normalizeWorkflowCanvasDocument(workflow.nodes, workflow.edges)
		return { title: workflow.name, ...canvasDocument }
	}, [workflow])

	const {
		document,
		hasUnsavedChanges,
		isDraftPersisted,
		canvasKey,
		handleTitleChange,
		handleNodePositionCommit,
		handleNodeAdd,
		handleEdgesCommit,
		handleCanvasUpdate,
	} = useWorkflowEditorViewModel({
		workflowId: workflow?.id,
		workflowVersion: workflow?.version,
		serverDocument,
	})
	const modelNames = useMemo(() => createModelNameMap(providersData?.data.providers), [providersData?.data.providers])
	const canvas = useMemo(() => {
		if (!document) return null
		return {
			nodes: toWorkflowCanvasNodes(document.nodes, modelNames, technicalMode, catalogEvents),
			edges: toWorkflowCanvasEdges(document.edges),
		}
	}, [document, modelNames, technicalMode, catalogEvents])

	const openModal = useModalStore(state => state.open)
	const openConfirm = useModalStore(state => state.openConfirm)
	const toggleMutation = useToggleWorkflowMutation(workflowId ?? '')
	const { execute, phase, isExecuting, canExecute, nodeStatus, requestId } = useWorkflowExecution(workflowId ?? '')
	const { handleSave, isSaving, canSave } = useWorkflowSave({
		workflowId: workflowId ?? '',
		description: workflow?.description,
		document,
		hasUnsavedChanges,
	})
	const currentWorkflowId = useRef(workflowId)
	const executionVisitId = useRef(0)

	const handleExecute = () => {
		if (!canExecute) return
		if (phase === 'interrupted') {
			const selectedWorkflowId = workflowId
			const selectedVisitId = executionVisitId.current
			openConfirm({
				title: '다시 실행할까요?',
				message: '이전 실행이 서버에서 계속되고 있을 수 있어요. 새로 실행하면 작업이 중복될 수 있습니다.',
				confirmText: '새로 실행',
				onConfirm: () => {
					const current = useExecutionStore.getState().executions[selectedWorkflowId ?? '']
					if (
						currentWorkflowId.current !== selectedWorkflowId ||
						executionVisitId.current !== selectedVisitId ||
						current?.requestId !== requestId ||
						current.phase !== 'interrupted'
					)
						return
					void execute().catch(() => undefined)
				},
			})
			return
		}
		void execute().catch(() => undefined)
	}

	const [localActive, setLocalActive] = useState<{ workflowId: string; requestId: number; value: boolean } | null>(null)
	if (localActive && localActive.workflowId !== workflowId) setLocalActive(null)
	const active = localActive && localActive.workflowId === workflowId ? localActive.value : workflow?.active
	const toggleRequestId = useRef(0)

	useLayoutEffect(() => {
		executionVisitId.current += 1
		toggleRequestId.current += 1
		currentWorkflowId.current = workflowId
		return () => {
			if (currentWorkflowId.current === workflowId) currentWorkflowId.current = undefined
		}
	}, [workflowId])

	const handleToggleActive = async () => {
		if (!workflowId) return
		const requestId = ++toggleRequestId.current
		const next = !(active ?? false)
		setLocalActive({ workflowId, requestId, value: next })
		try {
			await toggleMutation.mutateAsync(next)
		} catch (error) {
			if (currentWorkflowId.current === workflowId && toggleRequestId.current === requestId) {
				openModal('오류', isApiError(error) ? error.message : '상태 변경에 실패했어요. 다시 시도해주세요.')
			}
		} finally {
			setLocalActive(current => (current?.workflowId === workflowId && current.requestId === requestId ? null : current))
		}
	}

	if (!workflow && workflowQuery.isEnabled && workflowQuery.isPending) {
		return <WorkflowDetailSkeleton />
	}

	if (!workflow) {
		const isNotFound = isApiError(workflowQuery.error) && workflowNotFoundCodes.has(workflowQuery.error.code)
		return (
			<WorkflowDetailError
				isNotFound={isNotFound || !workflowId}
				onRetry={() => void workflowQuery.refetch()}
				onBackToList={() => navigate('/workflow')}
			/>
		)
	}

	return (
		<div className='-mt-6 -mx-6 -mb-6 lg:-ml-6 flex flex-col' style={{ height: 'calc(100vh - var(--layout-header-height))' }}>
			<WorkflowToolbar
				title={document?.title ?? workflow.name}
				onTitleChange={handleTitleChange}
				hasUnsavedChanges={hasUnsavedChanges}
				isDraftPersisted={isDraftPersisted}
				status={active === undefined ? undefined : active ? 'active' : 'paused'}
				active={active}
				onToggleActive={handleToggleActive}
				onSave={() => void handleSave()}
				isSaving={isSaving}
				canSave={canSave}
				onExecute={handleExecute}
				isExecuting={isExecuting}
				isRequesting={phase === 'requesting'}
				isWaitingApproval={phase === 'waitingApproval'}
				canExecute={canExecute}
				technicalMode={technicalMode}
				onToggleTechnicalMode={() => setTechnicalMode(enabled => !enabled)}
				isNodePaletteOpen={isPaletteOpen}
				onToggleNodePalette={() => setIsPaletteOpen(open => !open)}
				nodePaletteButtonRef={paletteButtonRef}
				isRefreshing={workflowQuery.isRefetching}
				isRefreshError={workflowQuery.isRefetchError}
				onRetryRefresh={() => void workflowQuery.refetch()}
			/>
			<div className='relative flex-1'>
				{canvas && canvasKey ? (
					<WorkflowCanvas
						key={canvasKey}
						nodes={canvas.nodes}
						edges={canvas.edges}
						nodeStatus={nodeStatus}
						isTracking={phase === 'running'}
						isPaletteOpen={isPaletteOpen}
						onPaletteClose={closePalette}
						onNodeAdd={handleNodeAdd}
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
