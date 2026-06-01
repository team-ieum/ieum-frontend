import { useCallback, useMemo, useState } from 'react'
import { useWorkflowDashboardExecutionsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardExecutionsQuery'
import type { RunRow, UseDashboardRunLogsResult } from '@/types/dashboard'
import { mapWorkflowExecutionToRunRow } from '@/utils/dashboard/mapWorkflowDashboardExecution'

const RUN_LOG_PREVIEW_COUNT = 5

export const useDashboardRunLogs = (): UseDashboardRunLogsResult => {
	const [isExpanded, setIsExpanded] = useState(false)
	const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useWorkflowDashboardExecutionsQuery()

	const allRuns = useMemo<RunRow[]>(
		() => data?.pages.flatMap(page => page.data.content.map(mapWorkflowExecutionToRunRow)) ?? [],
		[data]
	)

	const visibleRuns = useMemo(() => (isExpanded ? allRuns : allRuns.slice(0, RUN_LOG_PREVIEW_COUNT)), [allRuns, isExpanded])

	const hasMore = useMemo(() => {
		if (!isExpanded) return allRuns.length > RUN_LOG_PREVIEW_COUNT || Boolean(hasNextPage)
		return Boolean(hasNextPage)
	}, [allRuns.length, hasNextPage, isExpanded])

	const footerLabel = useMemo(() => {
		if (!isExpanded) return '전체 이력 보기'
		if (hasNextPage) return isFetchingNextPage ? '불러오는 중…' : '더 보기'
		return '닫기'
	}, [hasNextPage, isExpanded, isFetchingNextPage])

	const handleFooterClick = useCallback(() => {
		if (!isExpanded) {
			setIsExpanded(true)
			return
		}
		if (hasNextPage) {
			void fetchNextPage()
			return
		}
		setIsExpanded(false)
	}, [fetchNextPage, hasNextPage, isExpanded])

	return {
		visibleRuns,
		hasMore,
		isExpanded,
		isLoading,
		isError,
		footerLabel,
		handleFooterClick,
	}
}
