import { useInfiniteQuery } from '@tanstack/react-query'
import { getWorkflowDashboardExecutions } from '@/api/workflowDashboard'
import { queryKeys } from '@/constants/queryKeys'

export const DASHBOARD_EXECUTIONS_PAGE_SIZE = 20

export const useWorkflowDashboardExecutionsQuery = () =>
	useInfiniteQuery({
		queryKey: queryKeys.workflows.dashboardExecutions(DASHBOARD_EXECUTIONS_PAGE_SIZE),
		queryFn: ({ pageParam }) => getWorkflowDashboardExecutions({ cursor: pageParam, size: DASHBOARD_EXECUTIONS_PAGE_SIZE }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
	})
