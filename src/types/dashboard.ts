import type { AsyncResourceState } from '@/types/asyncResource'
import type { IntegrationBrand } from '@/types/integration'

// --- Model (도메인) ---

export type RunStatus = 'success' | 'error' | 'running'

export type RunRow = {
	id: string
	displayId: string
	name: string
	status: RunStatus
	time: string
	trigger: string
	/** 앱 이벤트 트리거만 있다. 칩에 이 브랜드 로고를 함께 보여 준다. */
	triggerBrand?: IntegrationBrand
	when: string
}

type ErrorSeverity = 'error' | 'warning'

/** `validation`은 실행 전 정적 검증에서 거부된 실행이고, 그 밖의 실패는 `execution`이다. */
type ErrorRowKind = 'execution' | 'validation'

export type ErrorRow = {
	/** 실행 단위로 고유한 executionId */
	id: string
	kind: ErrorRowKind
	workflowId: string
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

type PillTone = 'active' | 'inactive' | 'error' | 'running'

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

export type DashboardExpandableListState<TRow> = {
	visibleItems: TRow[]
	hasMore: boolean
	isExpanded: boolean
	resource: AsyncResourceState
	footerLabel: string
	handleFooterClick: () => void
}

// --- View (컴포넌트) ---

export type StatusBadgeConfig = {
	label: string
	icon: string
	pill: string
}

type StatusPillSkin = {
	wrap: string
	chip: string
	num: string
	dot: string
	label: string
}

export type StatusPillSkins = Record<PillTone, StatusPillSkin>

// --- ViewModel (훅) ---

export type DashboardViewModel = {
	hero: DashboardHeroMetrics
	hourlyExecutions: HourlyExecution[]
	summaryResource: AsyncResourceState
	workflow: DashboardWorkflowSummary
	runs: DashboardExpandableListState<RunRow>
	errors: DashboardExpandableListState<ErrorRow> & { errorCount: number }
	/** 검증 실패 오류의 워크플로우 편집 화면으로 이동한다. 편집 화면이 열릴 때 검증을 다시 실행한다. */
	handleOpenWorkflowProblems: (workflowId: string) => void
}
