import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { workflowDashboardSummaryQueryOptions } from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'
import type { WorkflowDashboardSummaryData } from '@/types/workflowDashboard'

export const useWorkflowDashboardSummaryQuery = (): UseQueryResult<WorkflowDashboardSummaryData, Error> =>
	useQuery(workflowDashboardSummaryQueryOptions())
