import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useIntegrationServiceWorkflowsQuery } from '@/hooks/integration/queries/useIntegrationServiceWorkflowsQuery'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { IntegrationBrand } from '@/types/integration'
import type { IntegrationServiceWorkflowListItem } from '@/types/integrationWorkflows'
import { getIntegrationServiceType } from '@/utils/integration/getIntegrationServiceType'
import { mapIntegrationServiceWorkflowToListItem } from '@/utils/integration/mapIntegrationServiceWorkflowToListItem'

type UseIntegrationServiceWorkflowListViewModelResult = {
	/** brand를 조회 가능한 serviceType으로 바꿀 수 없으면 false이고, 이때는 요청하지 않는다. */
	isSupportedService: boolean
	workflows: IntegrationServiceWorkflowListItem[]
	/**
	 * 다음 페이지 요청의 진행·실패는 포함하지 않는다. 그 상태는 `isFetchingNextPage`, `isFetchNextPageError`로 받는다.
	 * 재조회 중의 `isRefetchError`는 사용자가 갱신 실패 뒤 `retry`로 다시 요청한 경우에만 true다.
	 */
	resource: AsyncResourceState
	hasNextPage: boolean
	isFetchingNextPage: boolean
	isFetchNextPageError: boolean
	/** 다음 페이지를 요청한다. 다음 페이지 요청이 실패한 뒤 다시 시도할 때도 쓴다. */
	handleLoadMore: () => void
	handleOpenWorkflow: (workflow: IntegrationServiceWorkflowListItem) => void
}

/** 연동 서비스 상세에서 그 서비스를 쓰는 워크플로우 목록과 페이지 이동 동작을 제공한다. */
export const useIntegrationServiceWorkflowListViewModel = (
	brand: IntegrationBrand
): UseIntegrationServiceWorkflowListViewModelResult => {
	const navigate = useNavigate()
	const serviceType = getIntegrationServiceType(brand)
	const {
		data,
		isLoading,
		isRefetching,
		isLoadingError,
		isRefetchError,
		errorUpdatedAt,
		isFetchingNextPage,
		isFetchNextPageError,
		hasNextPage,
		refetch,
		fetchNextPage,
	} = useIntegrationServiceWorkflowsQuery(serviceType)
	// TanStack Query는 데이터가 있는 오류 상태에서 재조회가 시작되면 다음 페이지 오류 구분(fetchMore.direction)이 사라져
	// isRefetchError를 true로 바꾼다. 다음 페이지 실패 뒤 mount·reconnect 재조회가 갱신 실패로 보이지 않도록,
	// 사용자가 재시도한 오류 시각을 기억해 그 재조회만 갱신 실패로 둔다.
	const [retriedErrorUpdatedAt, setRetriedErrorUpdatedAt] = useState<number | null>(null)
	const isRetryingRefetchError = isRefetching && retriedErrorUpdatedAt === errorUpdatedAt

	return {
		isSupportedService: serviceType !== null,
		workflows: data?.pages.flatMap(page => page.data.content.map(mapIntegrationServiceWorkflowToListItem)) ?? [],
		resource: {
			isLoading,
			isRefetching,
			isLoadingError,
			isRefetchError: isRefetchError && (!isRefetching || isRetryingRefetchError),
			// 갱신 실패 배너의 버튼은 focus 유지를 위해 aria-disabled만 쓰므로 진행 중 요청은 여기서 막는다.
			retry: () => {
				if (isRefetching) return
				if (isRefetchError) setRetriedErrorUpdatedAt(errorUpdatedAt)
				void refetch()
			},
		},
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
		handleLoadMore: () => void fetchNextPage(),
		handleOpenWorkflow: workflow => navigate(`/workflow/${workflow.id}`, { state: { name: workflow.name } }),
	}
}
