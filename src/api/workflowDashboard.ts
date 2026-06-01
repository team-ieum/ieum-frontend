import { api } from '@/utils/AxiosInstance'
import type { WorkflowDashboardSummaryResponse } from '@/types/workflowDashboard'

export const getWorkflowDashboardSummary = async (): Promise<WorkflowDashboardSummaryResponse> => {
	const response = await api.get<WorkflowDashboardSummaryResponse>('/api/v1/workflows/dashboard/summary')
	return response.data
}
