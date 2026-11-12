import type { ReactNode } from 'react'

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
type IntegrationOrigin = 'webhook' | 'oauth'

/** 같은 브랜드를 여러 방식으로 연결할 수 있을 때 구분하는 연결 방식 */
export type IntegrationConnectionMethod = 'bot' | 'webhook'

export type IntegrationService = {
	id: string
	name: string
	brand: IntegrationBrand
	status: IntegrationStatus
	origin?: IntegrationOrigin
	connectionMethod?: IntegrationConnectionMethod
	/** OAuth 연결의 서버 provider 값(예: `SLACK`). 해제 경로를 고를 때 쓴다. */
	oauthProvider?: string
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
