import { api } from '@/utils/AxiosInstance'
import type { IntegrationServiceType, IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

// OAuth 해제 명세의 소문자 경로를 사용하고, 기존 Slack·Discord 조회 경로는 유지한다.
const WORKFLOW_PATH_SERVICE_TYPE: Record<IntegrationServiceType, string> = {
	GOOGLE: 'google',
	NOTION: 'notion',
	GITHUB: 'github',
	SLACK: 'SLACK',
	DISCORD: 'DISCORD',
}

export const getIntegrationServiceWorkflows = async (
	serviceType: IntegrationServiceType,
	params?: { cursor?: string; size?: number }
): Promise<IntegrationServiceWorkflowsResponse> => {
	const response = await api.get<IntegrationServiceWorkflowsResponse>(
		`/api/v1/integrations/${WORKFLOW_PATH_SERVICE_TYPE[serviceType]}/workflows`,
		{ params }
	)
	return response.data
}
