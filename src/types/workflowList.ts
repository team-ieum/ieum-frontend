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
	| 'runs'
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
	runs: number
	success: number
}

export type WorkflowActiveFilter = {
	kind: keyof WorkflowListFilters
	id: string
	label: string
	color?: string
	serviceId?: WorkflowServiceId
	status?: WorkflowStatus
}

export type WorkflowServiceMeta = {
	id: WorkflowServiceId
	name: string
	initial: string
	color: string
	foreground: string
}

export type WorkflowCategoryMeta = {
	id: WorkflowCategoryId
	label: string
	color: string
}

export type WorkflowStatusMeta = {
	label: string
	toneClass: string
	dotColor: string
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
	handleCreateWorkflow: () => void
	handleOpenWorkflow: (workflowId: string) => void
}
