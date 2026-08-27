import { useInfiniteQuery } from '@tanstack/react-query'
import { workflowDashboardErrorsQueryOptions } from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'

export const useWorkflowDashboardErrorsQuery = () => useInfiniteQuery(workflowDashboardErrorsQueryOptions())
