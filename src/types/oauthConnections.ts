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

/** 해제할 OAuth 연결(해제 mutation 변수). 공급자 하나에 연결이 여러 개인 Discord만 `providerAccountId`로 연결을 고른다. */
export type OAuthConnectionTarget = {
	provider: string
	providerAccountId?: string
}
