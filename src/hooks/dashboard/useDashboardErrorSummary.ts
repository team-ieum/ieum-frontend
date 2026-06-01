import { useCallback, useMemo, useState } from 'react'
import { useWorkflowDashboardErrorsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardErrorsQuery'
import type { ErrorRow, UseDashboardErrorSummaryResult } from '@/types/dashboard'
import { mapWorkflowDashboardErrorToRow } from '@/utils/dashboard/mapWorkflowDashboardError'

const ERROR_PREVIEW_COUNT = 3

export const useDashboardErrorSummary = (): UseDashboardErrorSummaryResult => {
	const [isExpanded, setIsExpanded] = useState(false)
	const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useWorkflowDashboardErrorsQuery()

	const allErrors = useMemo<ErrorRow[]>(
		() => data?.pages.flatMap(page => page.data.content.map(mapWorkflowDashboardErrorToRow)) ?? [],
		[data]
	)

	const visibleErrors = useMemo(
		() => (isExpanded ? allErrors : allErrors.slice(0, ERROR_PREVIEW_COUNT)),
		[allErrors, isExpanded]
	)

	const hasMore = useMemo(() => {
		if (!isExpanded) return allErrors.length > ERROR_PREVIEW_COUNT || Boolean(hasNextPage)
		return Boolean(hasNextPage)
	}, [allErrors.length, hasNextPage, isExpanded])

	const footerLabel = useMemo(() => {
		if (!isExpanded) return '전체 오류 이력 보기'
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
		visibleErrors,
		errorCount: allErrors.length,
		hasMore,
		isExpanded,
		isLoading,
		isError,
		footerLabel,
		handleFooterClick,
	}
}
