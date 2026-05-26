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

export type WorkflowCategoryId = 'cs' | 'marketing' | 'dev' | 'sales' | 'ops' | 'data'

export type WorkflowTriggerType = 'schedule' | 'webhook' | 'event' | 'manual'

export type WorkflowStatus = 'active' | 'paused' | 'error'

export type WorkflowSortKey = 'recent' | 'name' | 'runs' | 'status'

export type WorkflowViewMode = 'card' | 'row'

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
