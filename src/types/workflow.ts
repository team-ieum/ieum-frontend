import type { Edge, Node } from '@xyflow/react'
import type { ApiResponse } from './api'
import type { WorkflowDto, WorkflowEdgeDto, WorkflowNodeDto } from './workflowList'
import type { WorkflowNodeKind } from './workflowCommon'

export type WorkflowNodeRole = 'trigger' | 'ai' | 'action'
export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waitingApproval' | 'skipped' | 'interrupted'
export type WorkflowNodeIconKey = 'play' | 'globe' | 'shuffle' | 'branch' | 'bot' | 'workflow'

export type WorkflowTechnicalDetail = {
	label: string
	value: string
}

type WorkflowNodeData = {
	nodeType: string
	role: WorkflowNodeRole
	typeLabel: string
	step: number
	title: string
	description?: string
	technicalDetails: WorkflowTechnicalDetail[]
	modelId?: string
	modelName?: string
	status: WorkflowNodeStatus
	technicalMode: boolean
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflowNode'>

type WorkflowEdgeData = {
	/** 서버가 발급한 엣지 id. 캔버스에서 새로 이은 엣지와 레거시 엣지는 없다. */
	serverId?: string
	conditionType?: string | null
	flowing?: boolean
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData>

type CreateWorkflowNodeDto = {
	id: string
	event: string
	type?: WorkflowNodeKind
	label: string
	config: Record<string, unknown>
}

type CreateWorkflowEdgeDto = {
	id?: string
	source: string
	target: string
	conditionType?: string
}

// 트리거는 서버가 노드에서 계산하므로 최상위 triggerType·cronExpression은 보내지 않는다.
export type CreateWorkflowRequest = {
	name: string
	description?: string
	nodes: CreateWorkflowNodeDto[]
	edges: CreateWorkflowEdgeDto[]
}

export type CreateWorkflowResponse = ApiResponse<WorkflowDto>

export type UpdateWorkflowRequest = {
	name: string
	description?: string
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
}

export type UpdateWorkflowResponse = ApiResponse<WorkflowDto>

export interface WorkflowExecutionDto {
	id: string
	workflowId: string
	workflowVersionId: string
	status: string
	triggerType: string
	startedAt: string
	finishedAt: string
	createdAt: string
}

export interface ExecuteWorkflowRequest {
	triggerData?: Record<string, unknown>
}
