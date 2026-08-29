import { useCallback, useMemo, useState } from 'react'
import type { AsyncResourceState } from '@/types/asyncResource'

type PaginatedApiPage<TItem> = {
	data: {
		content: TItem[]
		hasNext: boolean
	}
}

type DashboardInfiniteQuery<TItem> = {
	data?: { pages: PaginatedApiPage<TItem>[] }
	isLoading: boolean
	isRefetching: boolean
	isLoadingError: boolean
	isRefetchError: boolean
	hasNextPage?: boolean
	fetchNextPage: () => Promise<unknown>
	isFetchingNextPage: boolean
	refetch: () => Promise<unknown>
}

type UseDashboardExpandableSectionOptions<TItem, TRow> = {
	previewCount: number
	expandLabel: string
	query: DashboardInfiniteQuery<TItem>
	mapItem: (item: TItem) => TRow
}

export type DashboardExpandableSection<TRow> = {
	visibleItems: TRow[]
	allItems: TRow[]
	hasMore: boolean
	isExpanded: boolean
	resource: AsyncResourceState
	footerLabel: string
	handleFooterClick: () => void
}

export const useDashboardExpandableSection = <TItem, TRow>({
	previewCount,
	expandLabel,
	query,
	mapItem,
}: UseDashboardExpandableSectionOptions<TItem, TRow>): DashboardExpandableSection<TRow> => {
	const [isExpanded, setIsExpanded] = useState(false)
	const {
		data,
		isLoading,
		isRefetching,
		isLoadingError,
		isRefetchError,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
		refetch,
	} = query

	const allItems = useMemo<TRow[]>(() => data?.pages.flatMap(page => page.data.content.map(mapItem)) ?? [], [data, mapItem])

	const visibleItems = useMemo(
		() => (isExpanded ? allItems : allItems.slice(0, previewCount)),
		[allItems, isExpanded, previewCount]
	)

	const hasMore = useMemo(() => {
		if (isExpanded) return true
		return allItems.length > previewCount || Boolean(hasNextPage)
	}, [allItems.length, hasNextPage, isExpanded, previewCount])

	const footerLabel = useMemo(() => {
		if (!isExpanded) return expandLabel
		if (hasNextPage) return isFetchingNextPage ? '불러오는 중…' : '더 보기'
		return '닫기'
	}, [expandLabel, hasNextPage, isExpanded, isFetchingNextPage])

	const handleFooterClick = useCallback(() => {
		if (isFetchingNextPage) return

		if (!isExpanded) {
			setIsExpanded(true)
			return
		}
		if (hasNextPage) {
			void fetchNextPage()
			return
		}
		setIsExpanded(false)
	}, [fetchNextPage, hasNextPage, isExpanded, isFetchingNextPage])

	return {
		visibleItems,
		allItems,
		hasMore,
		isExpanded,
		resource: {
			isLoading,
			isRefetching,
			isLoadingError,
			isRefetchError,
			retry: () => void refetch(),
		},
		footerLabel,
		handleFooterClick,
	}
}
