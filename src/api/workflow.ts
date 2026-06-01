import { api } from '@/utils/AxiosInstance'
import type { WorkflowListResponse } from '@/types/workflowList'

export const getWorkflows = async (params: { cursor?: string; size?: number }): Promise<WorkflowListResponse> => {
	const response = await api.get('/api/v1/workflows', { params })
	return response.data
}
