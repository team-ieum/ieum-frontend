import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow } from '@xyflow/react'
import '@/styles/react-flow.css'
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type Ref } from 'react'
import { useNavigate, useParams } from 'react-router'
import AnimatedEdge from '@/components/workflow/AnimatedEdge'
import NodeAddButton from '@/components/workflow/NodeAddButton'
import NodeCatalogPalette from '@/components/workflow/NodeCatalogPalette'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import { WorkflowNodeActionsContext } from '@/components/workflow/WorkflowNodeActionsContext'
import WorkflowStartCard from '@/components/workflow/WorkflowStartCard'
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar'
import WorkflowValidationBanner from '@/components/workflow/WorkflowValidationBanner'
import { WorkflowDetailError, WorkflowDetailSkeleton } from '@/components/workflow/WorkflowDetailAsyncState'
import { useProvidersQuery } from '@/hooks/aiCredentials/queries/useProvidersQuery'
import { useNodeCatalogQuery } from '@/hooks/workflow/queries/useNodeCatalogQuery'
import { useWorkflowQuery } from '@/hooks/workflow/queries/useWorkflowQuery'
import { useWorkflowCanvasEditor } from '@/hooks/workflow/useWorkflowCanvasEditor'
import { useWorkflowEditorViewModel } from '@/hooks/workflow/useWorkflowEditorViewModel'
import { useNodePalette, type NodePaletteState } from '@/hooks/workflow/useNodePalette'
import { useWorkflowExecuteCommand } from '@/hooks/workflow/useWorkflowExecuteCommand'
import { useWorkflowActivation } from '@/hooks/workflow/useWorkflowActivation'
import { useWorkflowSave } from '@/hooks/workflow/useWorkflowSave'
import { useWorkflowValidation } from '@/hooks/workflow/useWorkflowValidation'
import type { ApiErrorCode } from '@/types/api'
import type { WorkflowEdgeType, WorkflowNodeType } from '@/types/workflow'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeExecutionStatus } from '@/types/workflowExecution'
import type { WorkflowNodeDto } from '@/types/workflowList'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { isApiError } from '@/utils/ApiError'
import { cn } from '@/utils/cn'
import {
	createModelNameMap,
	normalizeWorkflowCanvasDocument,
	toWorkflowCanvasEdges,
	toWorkflowCanvasNodes,
	toWorkflowNodeStatus,
} from '@/utils/workflow/mapWorkflowCanvas'
import type { WorkflowDraftData } from '@/utils/workflow/workflowDraftStorage'

const nodeTypes = { workflowNode: WorkflowNode }
const edgeTypes = { animated: AnimatedEdge }
const EMPTY_VALIDATION_ERRORS: WorkflowValidationErrorDto[] = []
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
	/** 저장된 버전 기준 노드별 서버 검사 오류. 노드 카드에 개수 배지를 붙인다. */
	validationErrorsByNodeId: ReadonlyMap<string, WorkflowValidationErrorDto[]>
	/** 열린 팔레트와 그 목적. 닫혀 있으면 null. */
	palette: NodePaletteState | null
	onPaletteToggle: () => void
	onPaletteOpen: (state: NodePaletteState, invoker: HTMLElement) => void
	onPaletteClose: () => void
	/** 팔레트가 닫힐 때 포커스를 돌려받을 '노드 추가' 버튼. */
	paletteButtonRef: Ref<HTMLButtonElement>
	/** 시작 카드는 채팅이 열려 있으면 숨긴다. */
	isChatOpen: boolean
	onStartWithAi: () => void
	onNodeAdd: (node: WorkflowNodeDto, edges?: WorkflowEdgeType[]) => void
	onNodePositionCommit: (nodeId: string, position: { x: number; y: number }) => void
	onEdgesCommit: (edges: WorkflowEdgeType[]) => void
	onNodesRemove: (nodeIds: string[], edges: WorkflowEdgeType[]) => void
	/** 설정 패널이 열린 노드. 그 노드 카드에만 강조 테두리를 그린다. */
	settingsNodeId?: string
	onNodeSelect: (nodeId: string) => void
	onPaneClick: () => void
}

const WorkflowCanvas = ({
	nodes,
	edges,
	nodeStatus,
	isTracking,
	validationErrorsByNodeId,
	palette,
	onPaletteToggle,
	onPaletteOpen,
	onPaletteClose,
	paletteButtonRef,
	isChatOpen,
	onStartWithAi,
	onNodeAdd,
	onNodePositionCommit,
	onEdgesCommit,
	onNodesRemove,
	settingsNodeId,
	onNodeSelect,
	onPaneClick,
}: WorkflowCanvasProps) => {
	// ref로 넘기는 값을 editor 객체에서 꺼내 두지 않으면 lint가 editor 전체를 ref로 보고 렌더 중 접근으로 판정한다.
	const { setCanvasElement, ...editor } = useWorkflowCanvasEditor({
		initialNodes: nodes,
		initialEdges: edges,
		onNodePositionCommit,
		onEdgesCommit,
		onNodeAdd,
		onNodesRemove,
	})

	const handleCatalogSelect = (entry: NodeCatalogEntry) => {
		if (palette?.mode === 'next') editor.addNextCatalogNode(palette.sourceNodeId, entry)
		else editor.addCatalogNode(entry)
		onPaletteClose()
	}
	const nodeActions = useMemo(
		() => ({
			onAddNext: (nodeId: string, invoker: HTMLButtonElement) =>
				onPaletteOpen({ mode: 'next', sourceNodeId: nodeId }, invoker),
		}),
		[onPaletteOpen]
	)
	const isCanvasEmpty = editor.nodes.length === 0

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
						isSettingsOpen: node.id === settingsNodeId,
						validationErrorCount: validationErrorsByNodeId.get(node.id)?.length ?? 0,
					},
				}
			}),
		[editor.nodes, nodePresentation, nodeStatus, isTracking, settingsNodeId, validationErrorsByNodeId]
	)
	const displayEdges = useMemo(
		() =>
			editor.edges.map(edge => ({
				...edge,
				data: { ...edge.data, flowing: isTracking && nodeStatus[edge.target] === 'running' },
			})),
		[editor.edges, nodeStatus, isTracking]
	)

	// React Flow는 노드에서 Enter·Space를 선택으로만 처리하고 onNodeClick을 부르지 않아 키보드로도 설정 패널을 열 수 있게 한다.
	const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return
		const target = event.target
		if (!(target instanceof HTMLElement) || !target.classList.contains('react-flow__node')) return
		const nodeId = target.dataset.id
		if (nodeId) onNodeSelect(nodeId)
	}

	return (
		<WorkflowNodeActionsContext.Provider value={nodeActions}>
			<ReactFlow
				ref={setCanvasElement}
				onKeyDown={handleCanvasKeyDown}
				onInit={editor.onInit}
				className={WORKFLOW_CANVAS_CLASS}
				nodes={displayNodes}
				edges={displayEdges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodesChange={editor.onNodesChange}
				onEdgesChange={editor.onEdgesChange}
				onNodeDragStop={editor.onNodeDragStop}
				onNodeClick={(_event, node) => onNodeSelect(node.id)}
				onPaneClick={onPaneClick}
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
			<NodeAddButton
				isPaletteOpen={palette !== null}
				isAllPaletteOpen={palette?.mode === 'all'}
				onTogglePalette={onPaletteToggle}
				buttonRef={paletteButtonRef}
				showsEmptyHint={isCanvasEmpty}
			/>
			{isCanvasEmpty ? (
				<WorkflowStartCard
					// 팔레트·채팅이 열린 동안 숨기기만 해, 팔레트가 닫힐 때 '트리거 고르기' 버튼으로 포커스를 돌려줄 수 있게 한다.
					isHidden={palette !== null || isChatOpen}
					onPickTrigger={invoker => onPaletteOpen({ mode: 'trigger' }, invoker)}
					onStartWithAi={onStartWithAi}
				/>
			) : null}
			{palette ? (
				<NodeCatalogPalette
					// 목적이 바뀌면 고르던 앱 단계를 비우고 처음부터 보여 준다.
					key={palette.mode === 'next' ? `next-${palette.sourceNodeId}` : palette.mode}
					mode={palette.mode}
					onSelect={handleCatalogSelect}
					onClose={onPaletteClose}
				/>
			) : null}
		</WorkflowNodeActionsContext.Provider>
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
	// 팔레트는 열릴 때 패널로 포커스를 가져가므로 닫힐 때 연 버튼으로 돌려줘야 키보드 위치를 잃지 않는다.
	const { palette, openPalette, closePalette, toggleAllPalette, addButtonRef } = useNodePalette(workflowId)
	// 채팅 열림은 워크플로우마다 따로 둔다. 시작 카드의 'AI로 만들기'가 바깥에서 채팅을 연다.
	const [chatOpenWorkflowId, setChatOpenWorkflowId] = useState<string | null>(null)
	const isChatOpen = Boolean(workflowId) && chatOpenWorkflowId === workflowId
	const setChatOpen = (open: boolean) => setChatOpenWorkflowId(open && workflowId ? workflowId : null)
	const { data: catalogData } = useNodeCatalogQuery()
	// 카탈로그를 받기 전에는 판정하지 않아 정상 노드가 '지원하지 않는 작업'으로 보이지 않게 한다.
	const catalogEntries = useMemo(
		() => (catalogData ? new Map(catalogData.data.entries.map(entry => [entry.id, entry])) : undefined),
		[catalogData]
	)
	const [selectedNode, setSelectedNode] = useState<{ workflowId: string; nodeId: string } | null>(null)

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
		handleNodeUpdate,
		handleEdgesCommit,
		handleNodesRemove,
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
			nodes: toWorkflowCanvasNodes(document.nodes, modelNames, technicalMode, catalogEntries),
			edges: toWorkflowCanvasEdges(document.edges),
		}
	}, [document, modelNames, technicalMode, catalogEntries])

	// 채팅이 캔버스를 바꿔 고른 노드가 사라지면 설정 패널도 함께 닫힌다.
	const settingsNode =
		selectedNode && selectedNode.workflowId === workflowId
			? document?.nodes.find(node => node.id === selectedNode.nodeId)
			: undefined
	const closeNodeSettings = () => {
		setSelectedNode(null)
		// 설정 패널은 열릴 때 포커스를 가져가므로 닫힐 때 그 노드로 돌려줘 키보드 위치를 잃지 않게 한다.
		if (settingsNode) {
			window.document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(settingsNode.id)}"]`)?.focus()
		}
	}

	const { handleSave, isSaving, canSave } = useWorkflowSave({
		workflowId: workflowId ?? '',
		description: workflow?.description,
		document,
		hasUnsavedChanges,
	})
	const validation = useWorkflowValidation({ workflowId, hasUnsavedChanges, serverNodes: serverDocument?.nodes })
	const { active, handleToggleActive } = useWorkflowActivation({
		workflowId,
		serverActive: workflow?.active,
		revalidate: validation.revalidate,
	})
	// 정적 검사에 걸린 실행(400)은 실행 중 화면으로 넘어가지 않고 검사 오류로 보여 준다. 그 밖의 실행 오류는 지금처럼 조용히 둔다.
	const { phase, isExecuting, canExecute, nodeStatus, handleExecute } = useWorkflowExecuteCommand({
		workflowId,
		onExecutionError: validation.applyExecutionError,
	})

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
				isRefreshing={workflowQuery.isRefetching}
				isRefreshError={workflowQuery.isRefetchError}
				onRetryRefresh={() => void workflowQuery.refetch()}
				validationStatus={validation.statusView}
				onRetryValidation={validation.handleRevalidate}
			/>
			<div className='@container relative flex-1'>
				{canvas && canvasKey ? (
					<WorkflowCanvas
						key={canvasKey}
						nodes={canvas.nodes}
						edges={canvas.edges}
						nodeStatus={nodeStatus}
						isTracking={phase === 'running'}
						validationErrorsByNodeId={validation.errorsByNodeId}
						palette={palette}
						onPaletteToggle={toggleAllPalette}
						onPaletteOpen={openPalette}
						onPaletteClose={closePalette}
						paletteButtonRef={addButtonRef}
						isChatOpen={isChatOpen}
						onStartWithAi={() => setChatOpen(true)}
						onNodeAdd={handleNodeAdd}
						onNodePositionCommit={handleNodePositionCommit}
						onEdgesCommit={handleEdgesCommit}
						onNodesRemove={handleNodesRemove}
						settingsNodeId={settingsNode?.id}
						onNodeSelect={nodeId => workflowId && setSelectedNode({ workflowId, nodeId })}
						onPaneClick={() => setSelectedNode(null)}
					/>
				) : null}
				<WorkflowValidationBanner errors={validation.globalErrors} />
				{settingsNode ? (
					<NodeSettingsPanel
						// 캔버스가 다시 마운트돼도 패널은 유지해 입력 포커스를 뺏지 않는다. 바뀐 값은 칸이 스스로 다시 맞춘다.
						key={settingsNode.id}
						workflowId={workflowId ?? ''}
						node={settingsNode}
						nodes={document?.nodes ?? []}
						edges={document?.edges ?? []}
						onNodeChange={handleNodeUpdate}
						validationErrors={validation.errorsByNodeId.get(settingsNode.id) ?? EMPTY_VALIDATION_ERRORS}
						validatedNode={validation.validatedNodes?.find(node => node.id === settingsNode.id)}
						onNodeOpen={nodeId => workflowId && setSelectedNode({ workflowId, nodeId })}
						onClose={closeNodeSettings}
					/>
				) : null}
				<WorkflowChat
					// route가 페이지를 재사용하므로 워크플로우마다 다시 마운트해 이전 대화·응답 대기 상태를 넘기지 않는다.
					key={workflowId}
					workflowId={workflowId ?? ''}
					currentNodes={document?.nodes ?? []}
					currentEdges={document?.edges ?? []}
					onCanvasUpdate={handleCanvasUpdate}
					isBesideNodeSettings={Boolean(settingsNode)}
					showsStartHint={document?.nodes.length === 0}
					isOpen={isChatOpen}
					onOpenChange={setChatOpen}
				/>
			</div>
		</div>
	)
}

export default WorkFlowPage
