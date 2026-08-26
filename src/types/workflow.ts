import type { Edge, Node } from '@xyflow/react'
import type { ApiResponse } from './api'
import type { WorkflowDto } from './workflowList'
import type { WorkflowNodeKind, WorkflowTriggerKind } from './workflowCommon'

export type WorkflowNodeRole = 'trigger' | 'ai' | 'action'
export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error'

export type WorkflowNodeData = {
	nodeType: string
	role: WorkflowNodeRole
	typeLabel: string
	step: number
	title: string
	description?: string
	method?: string
	url?: string
	modelId?: string
	modelName?: string
	status: WorkflowNodeStatus
	technicalMode: boolean
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflowNode'>

export type WorkflowEdgeData = {
	conditionType?: string | null
	flowing?: boolean
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData>

export type CreateWorkflowNodeDto = {
	id: string
	type: WorkflowNodeKind
	label: string
	config: Record<string, unknown>
}

export type CreateWorkflowEdgeDto = {
	source: string
	target: string
	conditionType?: string
}

export type CreateWorkflowRequest = {
	name: string
	description?: string
	triggerType?: WorkflowTriggerKind
	cronExpression?: string
	nodes?: CreateWorkflowNodeDto[]
	edges?: CreateWorkflowEdgeDto[]
}

export type CreateWorkflowResponse = ApiResponse<WorkflowDto>

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
