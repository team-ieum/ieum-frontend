import type { ApiResponse } from '@/types/api'

export type WorkflowErrorCode =
	| 'WORKFLOW_NOT_FOUND'
	| 'WORKFLOW_DEFINITION_NOT_FOUND'
	| 'INVALID_WORKFLOW'
	| 'INVALID_CRON_EXPRESSION'
	| 'WORKFLOW_NOT_ACTIVE'
	| 'WEBHOOK_TRIGGER_MISMATCH'
	| 'EXECUTION_NOT_FOUND'
	| 'INVALID_CURSOR'

// --- API response types ---

export type WorkflowNodeDto = {
	id: string
	type: string
	label: string
	config: Record<string, unknown>
}

export type WorkflowEdgeDto = {
	source: string
	target: string
	conditionType: string
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
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
	createdAt: string
	updatedAt: string
}

export type WorkflowPageDto = {
	content: WorkflowDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type WorkflowListResponse = ApiResponse<WorkflowPageDto>

// --- UI types ---

export type WorkflowServiceId =
	| 'google'
	| 'slack'
	| 'hubspot'
	| 'salesforce'
	| 'airtable'
	| 'notion'
	| 'github'
	| 'linear'
	| 'figma'
	| 'jira'
	| 'dropbox'
	| 'discord'
	| 'zapier'
	| 'asana'

// prettier-ignore
export type WorkflowCategoryId =
	| 'cs'
	| 'marketing'
	| 'dev'
	| 'sales'
	| 'ops'
	| 'data'

// prettier-ignore
export type WorkflowTriggerType =
	| 'schedule'
	| 'webhook'
	| 'event'
	| 'manual'

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

export type IsoDateString = string

export type WorkflowListFilters = {
	services: WorkflowServiceId[]
	categories: WorkflowCategoryId[]
	statuses: WorkflowStatus[]
}

export type WorkflowListItem = {
	id: string
	name: string
	tags: string[]
	desc: string
	services: WorkflowServiceId[]
	category: WorkflowCategoryId
	status: WorkflowStatus
	trigger: WorkflowTriggerType
	lastRun: IsoDateString
	success: number
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
	workflows: WorkflowListItem[]
	activeFilters: WorkflowActiveFilter[]
	activeFilterCount: number
	totalCount: number
	serviceCounts: Record<WorkflowServiceId, number>
	categoryCounts: Record<WorkflowCategoryId, number>
	statusCounts: Record<WorkflowStatus, number>
	toggleService: (serviceId: WorkflowServiceId) => void
	toggleCategory: (categoryId: WorkflowCategoryId) => void
	toggleStatus: (status: WorkflowStatus) => void
	removeFilter: (filter: WorkflowActiveFilter) => void
	clearFilters: () => void
	onSearchChange: (value: string) => void
	onSortChange: (value: WorkflowSortKey) => void
	onViewChange: (value: WorkflowViewMode) => void
	isLoading: boolean
	isError: boolean
	hasNextPage: boolean
	fetchNextPage: () => void
	handleCreateWorkflow: () => void
	handleOpenWorkflow: (workflowId: string, workflowName: string) => void
	handleDeleteWorkflow: (workflowId: string) => void
}
