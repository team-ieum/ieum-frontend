import { api } from '@/utils/AxiosInstance'
import type {
	WorkflowDashboardErrorsResponse,
	WorkflowDashboardExecutionsResponse,
	WorkflowDashboardSummaryResponse,
} from '@/types/workflowDashboard'

export const getWorkflowDashboardSummary = async (): Promise<WorkflowDashboardSummaryResponse> => {
	const response = await api.get<WorkflowDashboardSummaryResponse>('/api/v1/workflows/dashboard/summary')
	return response.data
}

export const getWorkflowDashboardExecutions = async (params: {
	cursor?: string
	size?: number
}): Promise<WorkflowDashboardExecutionsResponse> => {
	const response = await api.get<WorkflowDashboardExecutionsResponse>('/api/v1/workflows/dashboard/executions', {
		params,
	})
	return response.data
}

export const getWorkflowDashboardErrors = async (params: {
	cursor?: string
	size?: number
}): Promise<WorkflowDashboardErrorsResponse> => {
	const response = await api.get<WorkflowDashboardErrorsResponse>('/api/v1/workflows/dashboard/errors', { params })
	return response.data
}
