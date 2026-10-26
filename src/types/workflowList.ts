import type { RefObject } from 'react'
import type { ApiResponse } from '@/types/api'
import type { AsyncResourceState } from '@/types/asyncResource'

export type WorkflowErrorCode =
	| 'WORKFLOW_NOT_FOUND'
	| 'WORKFLOW_DEFINITION_NOT_FOUND'
	| 'INVALID_WORKFLOW'
	| 'INVALID_CRON_EXPRESSION'
	| 'WORKFLOW_NOT_ACTIVE'
	| 'WEBHOOK_TRIGGER_MISMATCH'
	| 'EXECUTION_NOT_FOUND'
	| 'INVALID_CURSOR'
	| 'WORKFLOW_HAS_NO_AI_NODE'
	| 'CHAT_SESSION_NOT_FOUND'

// --- API response types ---

export type WorkflowNodeDto = {
	id: string
	/** 서버가 event로 계산해 응답에 채우는 값. 요청에 실어 보내도 서버는 무시합니다. */
	type: string
	/** 노드 정체성(카탈로그 항목 id, 예: `slack_bot.send_channel_message`). 생성·수정 요청에 필수입니다. */
	event: string
	label: string
	description?: string
	position?: {
		x: number
		y: number
	}
	config: Record<string, unknown>
}

export type WorkflowEdgeDto = {
	/** 서버 엣지 id. 레거시 정의는 null이고, 새 엣지는 생략하면 서버가 채웁니다. */
	id?: string | null
	source: string
	target: string
	conditionType?: string | null
}

export type WorkflowDto = {
	id: string
	userId: string
	name: string
	description: string
	active: boolean
	triggerType: string
	cronExpression: string | null
	version: number
	services: string[]
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
	createdAt: string
	updatedAt: string
}

type WorkflowPageDto = {
	content: WorkflowDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowListResponse = ApiResponse<WorkflowPageDto>

// --- UI types ---

export type WorkflowServiceId =
	| 'slack'
	| 'notion'
	| 'github'
	| 'gmail'
	| 'sheets'
	| 'google'
	| 'jira'
	| 'airtable'
	| 'discord'
	| 'linear'
	| 'webhook'

// prettier-ignore
export type WorkflowCategoryId =
	| 'cs'
	| 'marketing'
	| 'dev'
	| 'sales'
	| 'ops'
	| 'data'

/** 연동 앱 이벤트 트리거. 정의는 `APP_EVENT_TRIGGERS`에 있다. */
// prettier-ignore
export type WorkflowAppTriggerId =
	| 'gmailNewEmail'
	| 'githubNewIssue'

// prettier-ignore
export type WorkflowTriggerType =
	| 'schedule'
	| 'webhook'
	| 'event'
	| 'manual'
	| WorkflowAppTriggerId

// prettier-ignore
export type WorkflowStatus =
	| 'active'
	| 'paused'
	| 'error'

// prettier-ignore
export type WorkflowSortKey =
	| 'recent'
	| 'name'
	| 'status'

// prettier-ignore
export type WorkflowViewMode =
	| 'card'
	| 'row'

type IsoDateString = string

export type WorkflowListFilters = {
	services: WorkflowServiceId[]
	categories: WorkflowCategoryId[]
	statuses: WorkflowStatus[]
}

export type WorkflowListItem = {
	id: string
	name: string
	desc: string
	services: WorkflowServiceId[]
	category: WorkflowCategoryId
	status: WorkflowStatus
	trigger: WorkflowTriggerType
	cronExpression?: string | null
	nodeCount?: number
	updatedAt?: IsoDateString
	lastRun: IsoDateString
}

export type WorkflowListRowView = {
	id: string
	name: string
	services: WorkflowServiceId[]
	serviceNamesLabel: string
	hasServices: boolean
	nodeCount: number
	updatedAtRelative: string
	status: WorkflowStatus
	statusBarClass: string
	trigger: WorkflowTriggerType
	cronExpression?: string | null
	/** 스케줄 트리거의 cron을 사람이 읽는 문장으로 바꾼 값. 해석할 수 없으면 cron 원문이다. */
	scheduleLabel?: string
}

export type WorkflowActiveFilter = {
	kind: keyof WorkflowListFilters
	id: string
	label: string
	dotClass?: string
	serviceId?: WorkflowServiceId
	status?: WorkflowStatus
}

export type WorkflowServiceMeta = {
	id: WorkflowServiceId
	name: string
	initial: string
	bgClass: string
}

export type WorkflowCategoryMeta = {
	id: WorkflowCategoryId
	label: string
	dotClass: string
}

export type WorkflowStatusMeta = {
	label: string
	toneClass: string
	barClass: string
	dotBgClass: string
	dotRingClass?: string
}

export type WorkflowTriggerMeta = {
	label: string
}

export type WorkflowSortOption = {
	id: WorkflowSortKey
	label: string
}

export type WorkflowListViewModel = {
	search: string
	sort: WorkflowSortKey
	view: WorkflowViewMode
	filters: WorkflowListFilters
	workflows: WorkflowListRowView[]
	activeFilters: WorkflowActiveFilter[]
	activeFilterCount: number
	totalCount: number
	serviceCounts: Record<WorkflowServiceId, number>
	resource: AsyncResourceState
	isFiltered: boolean
	isRefetching: boolean
	isFetchingNextPage: boolean
	isFetchNextPageError: boolean
	toggleService: (serviceId: WorkflowServiceId) => void
	toggleCategory: (categoryId: WorkflowCategoryId) => void
	toggleStatus: (status: WorkflowStatus) => void
	removeFilter: (filter: WorkflowActiveFilter) => void
	clearFilters: () => void
	onSearchChange: (value: string) => void
	onSortChange: (value: WorkflowSortKey) => void
	onViewChange: (value: WorkflowViewMode) => void
	hasNextPage: boolean
	loadNextPage: () => void
	retryNextPage: () => void
	handleCreateWorkflow: () => void
	handleOpenWorkflow: (workflowId: string, workflowName: string) => void
	handleDeleteWorkflow: (workflowId: string) => void
}

export type WorkflowListPageViewModel = {
	list: WorkflowListViewModel
	headerRef: RefObject<HTMLElement | null>
	paginationSentinelRef: RefObject<HTMLDivElement | null>
	sectionMinHeight: string
}
