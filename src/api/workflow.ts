import { api } from '@/utils/AxiosInstance'
import type { WorkflowDto, WorkflowListResponse } from '@/types/workflowList'
import type { ApiResponse } from '@/types/api'
import type {
	CreateWorkflowRequest,
	CreateWorkflowResponse,
	ExecuteWorkflowRequest,
	WorkflowExecutionDto,
} from '@/types/workflow'

export const getWorkflows = async (params: { cursor?: string; size?: number }): Promise<WorkflowListResponse> => {
	const response = await api.get('/api/v1/workflows', { params })
	return response.data
}

export const getWorkflow = async (id: string): Promise<ApiResponse<WorkflowDto>> => {
	const response = await api.get(`/api/v1/workflows/${id}`)
	return response.data
}

export const activateWorkflow = async (id: string): Promise<ApiResponse<WorkflowDto>> => {
	const response = await api.post(`/api/v1/workflows/${id}/activate`)
	return response.data
}

export const deactivateWorkflow = async (id: string): Promise<ApiResponse<WorkflowDto>> => {
	const response = await api.post(`/api/v1/workflows/${id}/deactivate`)
	return response.data
}

export const executeWorkflow = async (id: string, body?: ExecuteWorkflowRequest): Promise<ApiResponse<WorkflowExecutionDto>> => {
	const response = await api.post(`/api/v1/workflows/${id}/execute`, body)
	return response.data
}

export const deleteWorkflow = async (id: string): Promise<ApiResponse<Record<string, never>>> => {
	const response = await api.delete(`/api/v1/workflows/${id}`)
	return response.data
}

export const createWorkflow = async (body: CreateWorkflowRequest): Promise<CreateWorkflowResponse> => {
	const response = await api.post('/api/v1/workflows', body)
	return response.data
}
