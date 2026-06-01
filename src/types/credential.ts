export type CredentialProvider = 'OPENAI' | 'CLAUDE' | 'GEMINI'
export type CredentialType = 'API_KEY' | 'OAUTH'

export interface CredentialItem {
	id: string
	provider: CredentialProvider
	credentialType: CredentialType
	displayName: string
	keyHint: string
	lastValidatedAt: string
	createdAt: string
	valid: boolean
}

export interface ValidateCredentialResult {
	provider: CredentialProvider
	failureReason: string | null
	valid: boolean
}

export interface ProviderModel {
	id: string
	displayName: string
	capabilities: string[]
	maxOutputTokens: number
	contextWindow: number
}

export interface ProviderInfo {
	provider: CredentialProvider
	displayName: string
	credentialTypes: CredentialType[]
	models: ProviderModel[]
}

export type CredentialErrorCode =
	| 'CREDENTIAL_DUPLICATE_NAME'
	| 'CREDENTIAL_LIMIT_EXCEEDED'
	| 'INVALID_API_KEY'
	| 'INVALID_API_KEY_FORMAT'
	| 'CREDENTIAL_IN_USE'
	| 'CREDENTIAL_NO_BILLING'
	| 'CREDENTIAL_EXPIRED'
	| 'CREDENTIAL_DECRYPT_FAILED'
	| 'PROVIDER_UNAVAILABLE'
	| 'CREDENTIAL_VALIDATION_TIMEOUT'
	| 'CREDENTIAL_VALIDATION_NETWORK_ERROR'
