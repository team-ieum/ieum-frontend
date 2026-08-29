import { useEffect, useRef, type RefObject } from 'react'

type UseWorkflowListPaginationSentinelParams = {
	hasNextPage: boolean
	isRefetching: boolean
	isFetchingNextPage: boolean
	isFetchNextPageError: boolean
	loadNextPage: () => void
}

export const useWorkflowListPaginationSentinel = ({
	hasNextPage,
	isRefetching,
	isFetchingNextPage,
	isFetchNextPageError,
	loadNextPage,
}: UseWorkflowListPaginationSentinelParams): RefObject<HTMLDivElement | null> => {
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel || !hasNextPage || isRefetching || isFetchingNextPage || isFetchNextPageError) {
			return
		}

		const observer = new IntersectionObserver(
			entries => {
				if (!entries.some(entry => entry.isIntersecting)) {
					return
				}

				observer.disconnect()
				loadNextPage()
			},
			{ rootMargin: '0px 0px 320px 0px' }
		)
		observer.observe(sentinel)

		return () => observer.disconnect()
	}, [hasNextPage, isRefetching, isFetchingNextPage, isFetchNextPageError, loadNextPage])

	return sentinelRef
}
