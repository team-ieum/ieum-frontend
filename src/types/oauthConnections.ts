import type { ApiResponse } from '@/types/api'

export type OAuthConnectionProvider = 'GOOGLE' | 'GITHUB' | 'NOTION' | (string & {})

export interface OAuthConnectionDto {
	id: string
	provider: OAuthConnectionProvider
	providerAccountId: string
	scopes: string[]
	createdAt: string
}

export type OAuthConnectionsListResponse = ApiResponse<OAuthConnectionDto[]>
