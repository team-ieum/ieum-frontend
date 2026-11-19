import type { ApiResponse } from '@/types/api'

export type OAuthDisconnectProvider = 'GITHUB' | 'NOTION'

export type OAuthDisconnectWorkflowsParams = {
	cursor?: string
	/** 서버가 한 번에 허용하는 최대 개수는 100개다. */
	size: number
}

export type DeleteOAuthConnectionResponse = ApiResponse<null>
