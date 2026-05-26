import type { ReactNode, RefObject } from 'react'

// --- Model (도메인) ---

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

export type IntegrationConnectedDisplayStatus = 'connected' | 'error' | 'expired'

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

export type IntegrationTabItem = {
	id: IntegrationTabId
	label: string
}

export type IntegrationData = {
	services: IntegrationService[]
}

export type IntegrationStatusLabelConfig = {
	text: string
	className: string
}

export type IntegrationBrandConfig = {
	bg: string
	fg: string
	tint: string
	icon: ReactNode
	label: string
}

// --- View (컴포넌트) ---

export type IntegrationSectionHeadingProps = {
	label: string
	count: number
	desc: string
	headingId?: string
}

export type IntegrationConnectedCardProps = {
	service: IntegrationService
	onManage: () => void
}

export type IntegrationAvailableTileProps = {
	service: IntegrationService
}

export type IntegrationConnectedDetailProps = {
	service: IntegrationService
	onBack: () => void
}

export type IntegrationTabsProps = {
	active: IntegrationTabId
	onChange: (tab: IntegrationTabId) => void
	view: IntegrationView
	connectedCount: number
	availableCount: number
}

export type IntegrationListBodyProps = {
	connected: IntegrationService[]
	available: IntegrationService[]
	onManage: (id: string) => void
	availableSectionRef?: RefObject<HTMLElement | null>
}

// --- ViewModel (훅) ---

export type UseIntegrationSettingResult = {
	view: IntegrationView
	activeTab: IntegrationTabId
	connected: IntegrationService[]
	available: IntegrationService[]
	currentService: IntegrationService | undefined
	connectedCount: number
	availableCount: number
	isListView: boolean
	availableSectionRef: RefObject<HTMLElement | null>
	goDetail: (id: string) => void
	goList: () => void
	handleTabChange: (tab: IntegrationTabId) => void
}
