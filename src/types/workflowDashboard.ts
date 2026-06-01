import type { ApiResponse } from '@/types/api'

export interface WorkflowDashboardMetrics {
	todayRuns: number
	percentageChange: number
	averageDurationSeconds: number
	successRate: number
}

export interface WorkflowDashboardWorkflowStats {
	total: number
	active: number
	inactive: number
	errored: number
	running: number
}

export interface WorkflowDashboardSummaryData {
	metrics: WorkflowDashboardMetrics
	hourlyCounts: Record<string, number>
	workflowStats: WorkflowDashboardWorkflowStats
}

export type WorkflowDashboardSummaryResponse = ApiResponse<WorkflowDashboardSummaryData>

export type WorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | (string & {})

export type WorkflowExecutionTriggerType = 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | (string & {})

export interface WorkflowExecutionDto {
	id: string
	workflowId: string
	workflowName: string
	status: WorkflowExecutionStatus
	durationSeconds: number
	triggerType: WorkflowExecutionTriggerType
	startedAt: string
	finishedAt: string | null
}

export interface WorkflowExecutionsPageDto {
	content: WorkflowExecutionDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowDashboardExecutionsResponse = ApiResponse<WorkflowExecutionsPageDto>

export type WorkflowFailedNodeType = 'TRIGGER' | 'ACTION' | 'CONDITION' | (string & {})

export interface WorkflowDashboardErrorDto {
	executionId: string
	workflowId: string
	workflowName: string
	failedNodeId: string
	failedNodeType: WorkflowFailedNodeType
	errorMessage: string
	startedAt: string
	finishedAt: string | null
}

export interface WorkflowDashboardErrorsPageDto {
	content: WorkflowDashboardErrorDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowDashboardErrorsResponse = ApiResponse<WorkflowDashboardErrorsPageDto>
