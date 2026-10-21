import type { CredentialProvider } from '@/types/credential'

export type AuthMethod = 'apikey' | 'oauth'
export type ConnectionStatus = 'connected' | 'empty'

export interface ApiKeyState {
	status: ConnectionStatus
	credentialId?: string
	keyHint?: string
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
	id: CredentialProvider
	name: string
	desc: string
	methods: AuthMethod[]
	brand: string
	tint: string
	state: ProviderState
}
