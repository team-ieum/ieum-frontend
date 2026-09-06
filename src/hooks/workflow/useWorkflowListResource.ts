import { useCallback, useMemo } from 'react'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import type { WorkflowListItem, WorkflowListViewModel } from '@/types/workflowList'
import { mapWorkflowDtoToListItem } from '@/utils/workflow/mapWorkflowDtoToListItem'

type WorkflowListResource = Pick<
	WorkflowListViewModel,
	'resource' | 'isRefetching' | 'hasNextPage' | 'isFetchingNextPage' | 'isFetchNextPageError' | 'loadNextPage' | 'retryNextPage'
> & {
	allWorkflows: WorkflowListItem[]
}

export const useWorkflowListResource = (): WorkflowListResource => {
	const {
		data,
		isLoading,
		isRefetching,
		isLoadingError,
		isRefetchError,
		isFetchingNextPage,
		isFetchNextPageError,
		refetch,
		hasNextPage,
		fetchNextPage,
	} = useWorkflowListQuery()

	const allWorkflows = useMemo<WorkflowListItem[]>(
		() => (data?.pages ?? []).flatMap(page => page.data.content.map(mapWorkflowDtoToListItem)),
		[data]
	)

	const loadNextPage = useCallback(() => {
		if (!hasNextPage || isRefetching || isFetchingNextPage || isFetchNextPageError) {
			return
		}
		void fetchNextPage({ cancelRefetch: false })
	}, [fetchNextPage, hasNextPage, isRefetching, isFetchingNextPage, isFetchNextPageError])

	const retryNextPage = useCallback(() => {
		if (!hasNextPage || isRefetching || isFetchingNextPage) {
			return
		}
		void fetchNextPage({ cancelRefetch: false })
	}, [fetchNextPage, hasNextPage, isRefetching, isFetchingNextPage])

	return {
		allWorkflows,
		resource: {
			isLoading,
			isRefetching: isRefetching && !isFetchingNextPage,
			isLoadingError,
			isRefetchError: isRefetchError && !isFetchNextPageError,
			retry: () => void refetch(),
		},
		isRefetching,
		hasNextPage: hasNextPage ?? false,
		isFetchingNextPage,
		isFetchNextPageError,
		loadNextPage,
		retryNextPage,
	}
}
