import type { ReactElement } from 'react'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { AsyncResourceState } from '@/types/asyncResource'
import { cn } from '@/utils/cn'

const skeletonClass = 'rounded bg-neutral-200'

const DashboardHeroSkeleton = (): ReactElement => (
	<div
		aria-hidden='true'
		className='grid min-h-[264px] gap-6 rounded-brand-md bg-main-deep-blue p-6 lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-0 lg:p-8'
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
		<div className='flex flex-col gap-4 lg:pl-8'>
			<SkeletonPulse className='h-4 w-36 rounded bg-main-blue' tone='brand' />
			<SkeletonPulse className='min-h-[200px] rounded-xl bg-main-blue' tone='brand' />
		</div>
	</div>
)

const DashboardWorkflowSkeleton = (): ReactElement => (
	<section aria-hidden='true' className='flex min-h-[116px] flex-col gap-4'>
		<SkeletonPulse className={cn(skeletonClass, 'h-5 w-48')} />
		<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
			{Array.from({ length: 4 }, (_, index) => (
				<SkeletonPulse key={index} className={cn(skeletonClass, 'h-20 rounded-brand-md')} />
			))}
		</div>
	</section>
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
	<div className='flex min-h-[444px] flex-col items-center justify-center rounded-brand-md border border-danger-200 bg-danger-50 px-6 text-center'>
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
