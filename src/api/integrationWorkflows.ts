import { api } from '@/utils/AxiosInstance'
import type { IntegrationServiceType, IntegrationServiceWorkflowsResponse } from '@/types/integrationWorkflows'

export const getIntegrationServiceWorkflows = async (
	serviceType: IntegrationServiceType,
	params?: { cursor?: string; size?: number }
): Promise<IntegrationServiceWorkflowsResponse> => {
	const response = await api.get<IntegrationServiceWorkflowsResponse>(`/api/v1/integrations/${serviceType}/workflows`, {
		params,
	})
	return response.data
}
