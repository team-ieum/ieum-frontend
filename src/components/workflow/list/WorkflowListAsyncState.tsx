import { useEffect, useRef, type ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import Spinner from '@/components/common/Spinner'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { WorkflowViewMode } from '@/types/workflowList'

const skeletonClass = 'rounded bg-neutral-200'

export const WorkflowListSkeleton = ({ view }: { view: WorkflowViewMode }): ReactElement => {
	if (view === 'row') {
		return (
			<div
				role='status'
				aria-label='워크플로우 테이블 불러오는 중'
				className='overflow-hidden rounded-xl border border-neutral-200 bg-white'
			>
				<div aria-hidden='true' className='overflow-x-auto'>
					<div className='min-w-[820px]'>
						<div className='h-11 bg-neutral-100' />
						{Array.from({ length: 5 }, (_, index) => (
							<div
								key={index}
								className='grid h-[73px] grid-cols-[56px_2fr_1.5fr_1fr_80px_100px_56px] items-center gap-3 border-t border-neutral-200 px-4'
							>
								{Array.from({ length: 7 }, (_, cellIndex) => (
									<SkeletonPulse key={cellIndex} className={`${skeletonClass} h-4 w-full`} />
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div role='status' aria-label='워크플로우 카드 불러오는 중' className='grid gap-3 md:grid-cols-2 2xl:grid-cols-3'>
			{Array.from({ length: 6 }, (_, index) => (
				<article
					key={index}
					aria-hidden='true'
					className='flex min-h-[148px] flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4'
				>
					<SkeletonPulse className={`${skeletonClass} h-5 w-2/3`} />
					<SkeletonPulse className={`${skeletonClass} mt-auto h-4 w-full`} />
					<div className='flex gap-3 border-t border-neutral-200 pt-3'>
						<SkeletonPulse className={`${skeletonClass} h-4 w-24`} />
						<SkeletonPulse className={`${skeletonClass} ml-auto h-5 w-16 rounded-full`} />
					</div>
				</article>
			))}
		</div>
	)
}

export const WorkflowListError = ({ retry }: Pick<AsyncResourceState, 'retry'>): ReactElement => (
	<div className='flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-danger-200 bg-danger-50 px-6 text-center'>
		<p className='m-0 typo-body2_semibold text-danger-700'>워크플로우를 불러오지 못했습니다.</p>
		<p className='mt-2 mb-0 typo-body3_regular text-neutral-500'>잠시 후 다시 시도해주세요.</p>
		<button
			type='button'
			onClick={retry}
			className='mt-4 rounded-[10px] border border-danger-300 bg-white px-4 py-2 typo-body2_semibold text-danger-700 transition-colors hover:bg-danger-100'
		>
			다시 시도
		</button>
	</div>
)

export const WorkflowListRefreshFeedback = ({
	isRefetching,
	isRefetchError,
	retry,
}: Pick<AsyncResourceState, 'isRefetching' | 'isRefetchError' | 'retry'>): ReactElement | null => {
	if (isRefetchError) {
		return (
			<div role='status' className='flex items-center gap-2 typo-caption1_medium text-danger-700'>
				<span>업데이트하지 못했습니다.</span>
				<button type='button' onClick={retry} className='underline underline-offset-2'>
					다시 시도
				</button>
			</div>
		)
	}

	if (isRefetching) {
		return (
			<span role='status' className='typo-caption1_medium text-neutral-500'>
				업데이트 중…
			</span>
		)
	}

	return null
}

type WorkflowListPaginationProps = {
	hasNextPage: boolean
	isRefetching: boolean
	isFetchingNextPage: boolean
	isFetchNextPageError: boolean
	loadNextPage: () => void
	retryNextPage: () => void
}

export const WorkflowListPagination = ({
	hasNextPage,
	isRefetching,
	isFetchingNextPage,
	isFetchNextPageError,
	loadNextPage,
	retryNextPage,
}: WorkflowListPaginationProps): ReactElement | null => {
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

	if (isFetchingNextPage) {
		return (
			<div className='mt-4 flex justify-center py-2'>
				<Spinner size='md' label='다음 워크플로우 불러오는 중' />
			</div>
		)
	}

	if (isFetchNextPageError) {
		return (
			<div role='status' className='mt-4 flex items-center justify-center gap-2 typo-body2_regular text-danger-700'>
				<span>다음 워크플로우를 불러오지 못했습니다.</span>
				<button type='button' onClick={retryNextPage} className='font-semibold underline underline-offset-2'>
					다시 시도
				</button>
			</div>
		)
	}

	return hasNextPage ? <div ref={sentinelRef} aria-hidden='true' className='h-px' /> : null
}
