// --- Model (도메인) ---

export type RunStatus = 'success' | 'error' | 'running'

export type RunRow = {
	id: string
	name: string
	status: RunStatus
	time: string
	trigger: string
	when: string
}

export type ErrorSeverity = 'error' | 'warning'

export type ErrorRow = {
	code: string
	severity: ErrorSeverity
	title: string
	flow: string
	when: string
}

export type HourlyExecution = {
	t: string
	count: number
}

export type PillTone = 'active' | 'inactive' | 'error' | 'running'

export type StatusPillItem = {
	label: string
	value: number
	sub: string
	tone: PillTone
}

export type DashboardHeroMetrics = {
	totalRuns: number
	changePercent: number
	avgDuration: string
	successRate: string
}

export type DashboardWorkflowSummary = {
	totalCount: number
	pills: StatusPillItem[]
}

export type DashboardData = {
	hero: DashboardHeroMetrics
	hourlyExecutions: HourlyExecution[]
	workflow: DashboardWorkflowSummary
	runs: RunRow[]
	errors: ErrorRow[]
}

// --- View (컴포넌트) ---

export type StatusBadgeConfig = {
	label: string
	icon: string
	pill: string
}

export type StatusPillSkin = {
	wrap: string
	chip: string
	num: string
	dot: string
	label: string
}

export type StatusPillSkins = Record<PillTone, StatusPillSkin>

// --- ViewModel (훅) ---

export type UseDashboardHeroMetricsResult = {
	hero: DashboardHeroMetrics
	hourlyExecutions: HourlyExecution[]
	isLoading: boolean
	isError: boolean
}

export type UseDashboardRunLogsResult = {
	visibleRuns: RunRow[]
	hasMore: boolean
	isExpanded: boolean
	toggleExpanded: () => void
}

export type UseDashboardErrorSummaryResult = {
	visibleErrors: ErrorRow[]
	errorCount: number
	hasMore: boolean
	isExpanded: boolean
	toggleExpanded: () => void
}

export type UseWorkflowStatusSummaryResult = {
	workflow: DashboardWorkflowSummary
	isLoading: boolean
	isError: boolean
}
