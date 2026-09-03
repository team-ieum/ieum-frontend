import type { ReactNode, RefObject } from 'react'
import type { AsyncResourceState } from '@/types/asyncResource'

// --- Model (도메인) ---

export type IntegrationBrand =
	| 'slack'
	| 'notion'
	| 'github'
	| 'google'
	| 'gmail'
	| 'sheets'
	| 'jira'
	| 'webhook'
	| 'airtable'
	| 'discord'
	| 'linear'

export type IntegrationStatus = 'connected' | 'available' | 'error' | 'expired'

export type IntegrationConnectedDisplayStatus = 'connected' | 'error' | 'expired'

/** 연결된 서비스의 출처 (웹훅 자격증명 / OAuth 연동) */
export type IntegrationOrigin = 'webhook' | 'oauth'

export type IntegrationService = {
	id: string
	name: string
	brand: IntegrationBrand
	status: IntegrationStatus
	origin?: IntegrationOrigin
	desc?: string
	account?: string
	lastSync?: string
	workflowCount?: number
	scopes?: string[]
}

export type IntegrationView = { kind: 'list' } | { kind: 'detail'; id: string }

export type IntegrationDetailResolution = 'list' | 'loading' | 'error' | 'ready'

export type IntegrationTabId = 'services' | 'aiCredentials'

export type IntegrationTabItem = {
	id: IntegrationTabId
	label: string
}

export type IntegrationStatusLabelConfig = {
	text: string
	className: string
}

export type IntegrationBrandConfig = {
	tint: string
	icon: ReactNode
	label: string
}

// --- ViewModel (훅) ---

export type UseIntegrationSettingResult = {
	view: IntegrationView
	detailResolution: IntegrationDetailResolution
	activeTab: IntegrationTabId
	connected: IntegrationService[]
	available: IntegrationService[]
	currentService: IntegrationService | undefined
	connectedCount: number
	availableCount: number
	canResolveAvailable: boolean
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
	isListView: boolean
	aiCredentialsSectionRef: RefObject<HTMLElement | null>
	goDetail: (id: string) => void
	goList: () => void
	handleTabChange: (tab: IntegrationTabId) => void
	onConnect: (id: string) => void
	webhookConnectServiceId: 'slack' | 'discord' | null
	closeWebhookConnect: () => void
}
