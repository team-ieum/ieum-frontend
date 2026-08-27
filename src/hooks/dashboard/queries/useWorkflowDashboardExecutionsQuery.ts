import { useInfiniteQuery } from '@tanstack/react-query'
import { workflowDashboardExecutionsQueryOptions } from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'

export const useWorkflowDashboardExecutionsQuery = () => useInfiniteQuery(workflowDashboardExecutionsQueryOptions())
