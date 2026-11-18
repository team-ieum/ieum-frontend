import type { ApiResponse } from '@/types/api'

type OAuthConnectionProvider = 'GOOGLE' | 'GITHUB' | 'NOTION' | 'SLACK' | (string & {})

export interface OAuthConnectionDto {
	id: string
	provider: OAuthConnectionProvider
	providerAccountId: string
	/** SLACK은 워크스페이스 이름, 다른 공급자는 null */
	displayName: string | null
	scopes: string[]
	createdAt: string
}

export type OAuthConnectionsListResponse = ApiResponse<OAuthConnectionDto[]>
