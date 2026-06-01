import { api } from '@/utils/AxiosInstance'
import type { WorkflowListResponse } from '@/types/workflowList'
import type { CreateWorkflowRequest, CreateWorkflowResponse } from '@/types/workflow'

export const getWorkflows = async (params: { cursor?: string; size?: number }): Promise<WorkflowListResponse> => {
	const response = await api.get('/api/v1/workflows', { params })
	return response.data
}

export const createWorkflow = async (body: CreateWorkflowRequest): Promise<CreateWorkflowResponse> => {
	const response = await api.post('/api/v1/workflows', body)
	return response.data
}
