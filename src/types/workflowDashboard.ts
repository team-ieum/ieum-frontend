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

type WorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | (string & {})

type WorkflowExecutionTriggerType = 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'EVENT' | (string & {})

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

interface WorkflowExecutionsPageDto {
	content: WorkflowExecutionDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowDashboardExecutionsResponse = ApiResponse<WorkflowExecutionsPageDto>

type WorkflowFailedNodeType = 'TRIGGER' | 'ACTION' | 'CONDITION' | (string & {})

export interface WorkflowDashboardErrorDto {
	executionId: string
	workflowId: string
	workflowName: string
	/** 노드가 하나도 실행되기 전에 거부된 실행(예: 정적 검증 실패)이면 null이다. */
	failedNodeId: string | null
	/** `failedNodeId`와 함께 null이 된다. */
	failedNodeType: WorkflowFailedNodeType | null
	errorMessage: string
	startedAt: string
	finishedAt: string | null
}

interface WorkflowDashboardErrorsPageDto {
	content: WorkflowDashboardErrorDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowDashboardErrorsResponse = ApiResponse<WorkflowDashboardErrorsPageDto>
