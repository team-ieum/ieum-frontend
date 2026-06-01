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
