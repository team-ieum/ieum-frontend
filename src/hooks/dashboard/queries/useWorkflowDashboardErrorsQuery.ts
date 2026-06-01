import { useInfiniteQuery } from '@tanstack/react-query'
import { getWorkflowDashboardErrors } from '@/api/workflowDashboard'
import { queryKeys } from '@/constants/queryKeys'

export const DASHBOARD_ERRORS_PAGE_SIZE = 20

export const useWorkflowDashboardErrorsQuery = () =>
	useInfiniteQuery({
		queryKey: queryKeys.workflows.dashboardErrors(DASHBOARD_ERRORS_PAGE_SIZE),
		queryFn: ({ pageParam }) => getWorkflowDashboardErrors({ cursor: pageParam, size: DASHBOARD_ERRORS_PAGE_SIZE }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
	})
