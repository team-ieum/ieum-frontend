import type { ReactNode } from 'react'

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

export type DashboardChartTooltipPayload = {
	value?: number
}

export type DashboardChartTooltipProps = {
	active?: boolean
	payload?: DashboardChartTooltipPayload[]
	label?: string
}

export type DashboardMiniStatProps = {
	label: string
	value: string
}

export type DashboardIconProps = {
	name: string
	size?: number
	fill?: 0 | 1
	className?: string
}

export type DashboardStatusBadgeProps = {
	status: RunStatus
}

export type DashboardCardProps = {
	children: ReactNode
	className?: string
}

export type DashboardTriggerChipProps = {
	kind: string
}

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
