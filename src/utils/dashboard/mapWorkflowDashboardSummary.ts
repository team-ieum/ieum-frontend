import type {
	WorkflowDashboardMetrics,
	WorkflowDashboardSummaryData,
	WorkflowDashboardWorkflowStats,
} from '@/types/workflowDashboard'
import type { DashboardHeroMetrics, DashboardWorkflowSummary, HourlyExecution, StatusPillItem } from '@/types/dashboard'

const WORKFLOW_STATUS_PILLS: Omit<StatusPillItem, 'value'>[] = [
	{ label: '활성', sub: '정상 실행 중', tone: 'active' },
	{ label: '비활성', sub: '중지됨', tone: 'inactive' },
	{ label: '오류 있음', sub: '점검 필요', tone: 'error' },
	{ label: '실행 중', sub: '지금 처리 중', tone: 'running' },
]

const toDisplayPercent = (value: number): number => (Math.abs(value) <= 1 ? value * 100 : value)

export const formatDashboardDuration = (seconds: number): string => {
	if (!Number.isFinite(seconds) || seconds < 0) return '–'
	if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
	if (seconds < 60) return `${seconds.toFixed(1)}s`
	const minutes = Math.floor(seconds / 60)
	const remainder = Math.round(seconds % 60)
	return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`
}

export const formatDashboardSuccessRate = (rate: number): string => {
	if (!Number.isFinite(rate)) return '–'
	return `${toDisplayPercent(rate).toFixed(1)}%`
}

export const mapMetricsToHero = (metrics: WorkflowDashboardMetrics): DashboardHeroMetrics => ({
	totalRuns: metrics.todayRuns,
	changePercent: Math.round(toDisplayPercent(metrics.percentageChange)),
	avgDuration: formatDashboardDuration(metrics.averageDurationSeconds),
	successRate: formatDashboardSuccessRate(metrics.successRate),
})

export const mapHourlyCountsToExecutions = (hourlyCounts: Record<string, number>): HourlyExecution[] =>
	Object.entries(hourlyCounts)
		.map(([hour, count]) => ({
			t: hour.padStart(2, '0'),
			count,
		}))
		.sort((a, b) => Number(a.t) - Number(b.t))

const mapWorkflowStatsToPills = (stats: WorkflowDashboardWorkflowStats): StatusPillItem[] => {
	const values = [stats.active, stats.inactive, stats.errored, stats.running]
	return WORKFLOW_STATUS_PILLS.map((pill, index) => ({
		...pill,
		value: values[index] ?? 0,
	}))
}

export const mapWorkflowStatsToSummary = (stats: WorkflowDashboardWorkflowStats): DashboardWorkflowSummary => ({
	totalCount: stats.total,
	pills: mapWorkflowStatsToPills(stats),
})

export const mapDashboardSummaryToHero = (summary: WorkflowDashboardSummaryData) => ({
	hero: mapMetricsToHero(summary.metrics),
	hourlyExecutions: mapHourlyCountsToExecutions(summary.hourlyCounts),
})

export const mapDashboardSummaryToWorkflow = (summary: WorkflowDashboardSummaryData): DashboardWorkflowSummary =>
	mapWorkflowStatsToSummary(summary.workflowStats)
