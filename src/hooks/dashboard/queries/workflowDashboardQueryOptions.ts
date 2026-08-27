import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { getWorkflowDashboardErrors, getWorkflowDashboardExecutions, getWorkflowDashboardSummary } from '@/api/workflowDashboard'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const DASHBOARD_EXECUTIONS_PAGE_SIZE = 20
export const DASHBOARD_ERRORS_PAGE_SIZE = 20

export const workflowDashboardSummaryQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.workflows.dashboardSummary(),
		queryFn: getWorkflowDashboardSummary,
		select: response => response.data,
		staleTime: QUERY_STALE_TIME_MS.dashboardSummary,
	})

export const workflowDashboardExecutionsQueryOptions = () =>
	infiniteQueryOptions({
		queryKey: queryKeys.workflows.dashboardExecutions(DASHBOARD_EXECUTIONS_PAGE_SIZE),
		queryFn: ({ pageParam }) => getWorkflowDashboardExecutions({ cursor: pageParam, size: DASHBOARD_EXECUTIONS_PAGE_SIZE }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
		staleTime: QUERY_STALE_TIME_MS.dashboardExecutions,
	})

export const workflowDashboardErrorsQueryOptions = () =>
	infiniteQueryOptions({
		queryKey: queryKeys.workflows.dashboardErrors(DASHBOARD_ERRORS_PAGE_SIZE),
		queryFn: ({ pageParam }) => getWorkflowDashboardErrors({ cursor: pageParam, size: DASHBOARD_ERRORS_PAGE_SIZE }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
		staleTime: QUERY_STALE_TIME_MS.dashboardErrors,
	})
