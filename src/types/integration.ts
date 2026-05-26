export type IntegrationBrand =
	| 'slack'
	| 'notion'
	| 'github'
	| 'google'
	| 'openai'
	| 'gmail'
	| 'sheets'
	| 'jira'
	| 'webhook'
	| 'airtable'
	| 'discord'
	| 'linear'

export type IntegrationStatus = 'connected' | 'available' | 'error' | 'expired'

export type IntegrationService = {
	id: string
	name: string
	brand: IntegrationBrand
	status: IntegrationStatus
	desc?: string
	account?: string
	lastSync?: string
	workflowCount?: number
	scopes?: string[]
}

export type IntegrationView = { kind: 'list' } | { kind: 'detail'; id: string }

export type IntegrationTabId = 'connected' | 'available'
