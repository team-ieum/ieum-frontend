import { useInfiniteQuery } from '@tanstack/react-query'
import { getWorkflows } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'

export const useWorkflowListQuery = (size = 20) =>
	useInfiniteQuery({
		queryKey: queryKeys.workflows.list({ size }),
		queryFn: ({ pageParam }) => getWorkflows({ cursor: pageParam, size }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => (page.data.hasNext ? (page.data.nextCursor ?? undefined) : undefined),
	})
