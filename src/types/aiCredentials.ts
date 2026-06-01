export type AuthMethod = 'apikey' | 'oauth'
export type ConnectionStatus = 'connected' | 'empty'
export type IntegrationTab = 'connected' | 'ai-creds' | 'browser'

export interface ApiKeyState {
	status: ConnectionStatus
	masked?: string
}

export interface OAuthState {
	status: ConnectionStatus
	account?: string
}

export interface ProviderState {
	apikey?: ApiKeyState
	oauth?: OAuthState
}

export interface AiProvider {
	id: string
	name: string
	desc: string
	methods: AuthMethod[]
	brand: string
	tint: string
	state: ProviderState
}

export interface IntegrationTabItem {
	id: IntegrationTab
	label: string
	icon: string
}
