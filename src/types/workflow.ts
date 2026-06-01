import type { Node } from '@xyflow/react'
import type { ApiResponse } from './api'
import type { WorkflowDto } from './workflowList'
import type { WorkflowNodeKind, WorkflowTriggerKind } from './workflowCommon'

export type WorkflowNodeData = {
	brand: 'webhook' | 'openai' | 'filter' | 'slack' | 'notion' | 'warning'
	title: string
	method: string
	url: string
	check?: boolean
	warn?: boolean
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflowNode'>

export type ChatMessage = { type: 'assistant'; body: string } | { type: 'user'; body: string }

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
