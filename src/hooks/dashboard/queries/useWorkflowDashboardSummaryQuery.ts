import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getWorkflowDashboardSummary } from '@/api/workflowDashboard'
import { queryKeys } from '@/constants/queryKeys'
import type { WorkflowDashboardSummaryData } from '@/types/workflowDashboard'

export const useWorkflowDashboardSummaryQuery = (): UseQueryResult<WorkflowDashboardSummaryData, Error> =>
	useQuery({
		queryKey: queryKeys.workflows.dashboardSummary(),
		queryFn: getWorkflowDashboardSummary,
		select: response => response.data,
	})
