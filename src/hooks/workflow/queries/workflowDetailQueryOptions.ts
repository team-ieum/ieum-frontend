import { queryOptions } from '@tanstack/react-query'
import { getWorkflow } from '@/api/workflow'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

export const workflowDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.workflows.detail(id),
		queryFn: () => getWorkflow(id),
		staleTime: QUERY_STALE_TIME_MS.workflowDetail,
	})
