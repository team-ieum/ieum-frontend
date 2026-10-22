import type { ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { AsyncResourceState } from '@/types/asyncResource'
import { cn } from '@/utils/cn'

const skeletonClass = 'rounded bg-neutral-200'

const DashboardHeroSkeleton = (): ReactElement => (
	<div
		aria-hidden='true'
		className='grid min-h-66 gap-6 rounded-brand-md bg-main-deep-blue p-6 lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-0 lg:p-8'
	>
		<div className='flex flex-col gap-4 lg:border-r lg:border-main-blue lg:pr-8'>
			<SkeletonPulse className='h-4 w-24 rounded bg-main-blue' tone='brand' />
			<SkeletonPulse className='h-12 w-36 rounded bg-main-blue' tone='brand' />
			<SkeletonPulse className='h-7 w-40 rounded-full bg-main-blue' tone='brand' />
			<div className='mt-auto flex gap-6'>
				<SkeletonPulse className='h-12 w-20 rounded bg-main-blue' tone='brand' />
				<SkeletonPulse className='h-12 w-20 rounded bg-main-blue' tone='brand' />
			</div>
		</div>
		<div className='flex flex-col lg:pl-8'>
			{/* 차트 제목 행은 '실시간' pill(py-1 + caption 한 줄) 높이를 따른다. */}
			<div className='mb-3 flex h-6.5 items-center'>
				<SkeletonPulse className='h-4 w-36 rounded bg-main-blue' tone='brand' />
			</div>
			<SkeletonPulse className='min-h-50 rounded-xl bg-main-blue' tone='brand' />
		</div>
	</div>
)

const DashboardWorkflowSkeleton = (): ReactElement => (
	<section aria-hidden='true' className='flex min-h-29 flex-col gap-4'>
		<div className='typo-title3_semibold flex h-lh items-center'>
			<SkeletonPulse className={cn(skeletonClass, 'h-5 w-48')} />
		</div>
		<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
			{Array.from({ length: 4 }, (_, index) => (
				<SkeletonPulse key={index} className={cn(skeletonClass, 'h-19.5 rounded-brand-md')} />
			))}
		</div>
	</section>
)

/** 요약 데이터는 도착했지만 hero 차트 chunk를 아직 받는 중일 때 hero 자리를 같은 크기로 유지한다. */
export const DashboardHeroChunkFallback = (): ReactElement => (
	<div role='status' aria-label='대시보드 차트 불러오는 중' aria-busy='true'>
		<DashboardHeroSkeleton />
	</div>
)

/** hero 차트 chunk를 불러오지 못했을 때 hero 자리를 같은 크기로 유지하고 새로고침을 안내한다. */
export const DashboardHeroChunkError = ({ onReload }: { onReload: () => void }): ReactElement => (
	<div
		role='alert'
		className='flex min-h-66 flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'
	>
		<p className='m-0 typo-body2_semibold text-danger-700'>차트를 불러오지 못했습니다.</p>
		<button
			type='button'
			onClick={onReload}
			className='mt-4 rounded-brand-sm border border-danger-300 bg-neutral-white px-4 py-2 typo-body3_semibold text-danger-700 transition-colors hover:bg-danger-100'
		>
			새로고침
		</button>
	</div>
)

export const DashboardSummarySkeleton = (): ReactElement => (
	<div className='flex flex-col gap-8'>
		<DashboardHeroSkeleton />
		<DashboardWorkflowSkeleton />
	</div>
)

type DashboardResourceStatusProps = Pick<AsyncResourceState, 'isLoading' | 'isLoadingError'> & {
	loadingMessage: string
	errorMessage: string
}

export const DashboardResourceStatus = ({
	isLoading,
	isLoadingError,
	loadingMessage,
	errorMessage,
}: DashboardResourceStatusProps): ReactElement => (
	<span role='status' aria-atomic='true' className='sr-only'>
		{isLoading ? loadingMessage : isLoadingError ? errorMessage : ''}
	</span>
)

export const DashboardSummaryError = ({ retry }: Pick<AsyncResourceState, 'retry'>): ReactElement => (
	<div className='flex min-h-111 flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'>
		<p className='m-0 typo-body2_semibold text-danger-700'>통계를 불러오지 못했습니다.</p>
		<button
			type='button'
			onClick={retry}
			className='mt-4 rounded-brand-sm border border-danger-300 bg-neutral-white px-4 py-2 typo-body3_semibold text-danger-700 transition-colors hover:bg-danger-100'
		>
			다시 시도
		</button>
	</div>
)

type DashboardRefreshFeedbackProps = Pick<AsyncResourceState, 'isRefetching' | 'isRefetchError' | 'retry'>

export const DashboardRefreshFeedback = ({
	isRefetching,
	isRefetchError,
	retry,
}: DashboardRefreshFeedbackProps): ReactElement | null => {
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
