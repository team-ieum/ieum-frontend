import { infiniteQueryOptions } from '@tanstack/react-query'
import { getWorkflows } from '@/api/workflow'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const WORKFLOW_LIST_PAGE_SIZE = 20

export const workflowListQueryOptions = (size = WORKFLOW_LIST_PAGE_SIZE) =>
	infiniteQueryOptions({
		queryKey: queryKeys.workflows.list({ size }),
		queryFn: ({ pageParam }) => getWorkflows({ cursor: pageParam, size }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
		staleTime: QUERY_STALE_TIME_MS.workflowList,
	})
