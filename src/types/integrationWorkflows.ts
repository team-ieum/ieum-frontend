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

export type IntegrationServiceWorkflowsPageDto = {
	content: IntegrationServiceWorkflowDto[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

export type IntegrationServiceWorkflowsResponse = ApiResponse<IntegrationServiceWorkflowsPageDto>
