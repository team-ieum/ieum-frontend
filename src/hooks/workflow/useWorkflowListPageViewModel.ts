import { useEffect, useRef, useState } from 'react'
import { useSnapPastHeader } from '@/hooks/workflow/useSnapPastHeader'
import { useWorkflowListPaginationSentinel } from '@/hooks/workflow/useWorkflowListPaginationSentinel'
import { useWorkflowListViewModel } from '@/hooks/workflow/useWorkflowListViewModel'
import type { WorkflowListPageViewModel } from '@/types/workflowList'

/** section gap-6 = 1.5rem — 헤더↔필터 간격과 스냅 거리 맞춤 */
const HEADER_TO_CONTENT_GAP_PX = 24

export const useWorkflowListPageViewModel = (): WorkflowListPageViewModel => {
	const listViewModel = useWorkflowListViewModel()
	const headerRef = useRef<HTMLElement>(null)
	const [headerHeight, setHeaderHeight] = useState(0)
	const paginationSentinelRef = useWorkflowListPaginationSentinel({
		hasNextPage: listViewModel.hasNextPage,
		isRefetching: listViewModel.isRefetching,
		isFetchingNextPage: listViewModel.isFetchingNextPage,
		isFetchNextPageError: listViewModel.isFetchNextPageError,
		loadNextPage: listViewModel.loadNextPage,
	})

	useSnapPastHeader(headerRef, HEADER_TO_CONTENT_GAP_PX)

	useEffect(() => {
		const header = headerRef.current
		if (!header) return

		const updateHeight = () => setHeaderHeight(header.offsetHeight)
		updateHeight()

		const observer = new ResizeObserver(updateHeight)
		observer.observe(header)
		return () => observer.disconnect()
	}, [])

	const sectionMinHeight = `calc(100vh - var(--layout-header-height) - 3rem + ${headerHeight + HEADER_TO_CONTENT_GAP_PX}px)`

	return {
		list: listViewModel,
		headerRef,
		paginationSentinelRef,
		sectionMinHeight,
	}
}
