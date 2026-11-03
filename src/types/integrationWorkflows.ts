import type { ApiResponse } from '@/types/api'

export type IntegrationServiceType = 'GOOGLE' | 'NOTION' | 'GITHUB' | 'SLACK' | 'DISCORD'

export type IntegrationServiceWorkflowDto = {
	id: string
	name: string
	description: string
	active: boolean
	triggerType: string
	usedNodeCount: number
	updatedAt: string
}

type IntegrationServiceWorkflowsPageDto = {
	content: IntegrationServiceWorkflowDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type IntegrationServiceWorkflowsResponse = ApiResponse<IntegrationServiceWorkflowsPageDto>

/** 서비스 상세의 연동 워크플로우 목록 한 행에 표시할 값 */
export type IntegrationServiceWorkflowListItem = {
	id: string
	name: string
	description: string
	isActive: boolean
	/** 서버 `triggerType`을 화면 문구로 바꾼 값. 모르는 값이면 원문을 그대로 쓴다. */
	triggerLabel: string
	usedNodeCount: number
	/** 마지막 수정 시각의 상대 시간 문구 */
	updatedAtLabel: string
}
