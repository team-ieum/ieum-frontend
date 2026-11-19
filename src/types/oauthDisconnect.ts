import type { ApiResponse } from '@/types/api'

export type OAuthDisconnectProvider = 'GITHUB' | 'NOTION'

export type OAuthDisconnectWorkflowsParams = {
	cursor?: string
	/** 서버가 한 번에 허용하는 최대 개수는 100개다. */
	size: number
}

export type DeleteOAuthConnectionResponse = ApiResponse<null>

export type DisconnectImpact = {
	workflows: {
		id: string
		name: string
		isActive: boolean
		/** 해제 후에도 활성 상태로 남아 예약 또는 웹훅 실행 때마다 실패한다. */
		isAutomaticExecutionAtRisk: boolean
	}[]
	automaticCount: number
}
