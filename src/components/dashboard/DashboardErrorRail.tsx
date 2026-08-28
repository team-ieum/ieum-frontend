import type { DashboardExpandableListState, ErrorRow } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import DashboardCard from './DashboardCard'
import DashboardIcon from './DashboardIcon'
import { DashboardRefreshFeedback } from './DashboardAsyncState'

type DashboardErrorRailProps = {
	errors: DashboardExpandableListState<ErrorRow> & { errorCount: number }
}

const DashboardErrorRail = ({ errors }: DashboardErrorRailProps) => {
	const { visibleItems, errorCount, hasMore, isExpanded, resource, footerLabel, handleFooterClick } = errors

	return (
		<DashboardCard className='flex min-h-[253px] w-full flex-col' aria-busy={resource.isLoading || resource.isRefetching}>
			{resource.isLoading ? <span role='status' aria-label='오류 목록 불러오는 중' className='sr-only' /> : null}
			<div className='flex items-center justify-between border-b border-neutral-200 px-5 py-4'>
				<div className='flex items-center gap-2'>
					<DashboardIcon name='error_outline' size={16} fill={1} className='text-danger-600' />
					<h3 className='typo-body2_semibold m-0 text-neutral-900'>오류 요약</h3>
				</div>
				<div className='flex items-center gap-3'>
					<DashboardRefreshFeedback {...resource} />
					{resource.isLoading || resource.isLoadingError ? (
						<span
							aria-hidden='true'
							className='h-6 w-12 animate-pulse rounded-full bg-neutral-200 motion-reduce:animate-none'
						/>
					) : (
						<span className='rounded-full border border-danger-300 bg-danger-100 px-2.5 py-0.5 typo-caption1_semibold text-danger-700'>
							{errorCount}건
						</span>
					)}
				</div>
			</div>

			{resource.isRefetchError ? (
				<p className='m-0 border-b border-neutral-200 px-5 py-3 typo-caption1_medium text-danger-700'>
					기존 오류 목록을 표시하고 있습니다.
				</p>
			) : null}

			<ul>
				{resource.isLoading ? (
					Array.from({ length: 3 }, (_, index) => (
						<li
							key={index}
							aria-hidden='true'
							className='flex gap-3 border-b border-neutral-100 px-5 py-3.5 last:border-b-0'
						>
							<div className='size-7 animate-pulse rounded-lg bg-neutral-200 motion-reduce:animate-none' />
							<div className='flex flex-1 flex-col gap-2'>
								<div className='h-3 w-24 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
								<div className='h-4 w-3/4 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none' />
							</div>
						</li>
					))
				) : resource.isLoadingError ? (
					<li className='px-5 py-8 text-center typo-body3_regular text-danger-700'>
						<p className='m-0'>오류 목록을 불러오지 못했습니다.</p>
						<button
							type='button'
							onClick={resource.retry}
							className='mt-3 rounded-brand-sm border border-danger-300 bg-neutral-white px-3 py-1.5 typo-caption1_semibold text-danger-700'
						>
							다시 시도
						</button>
					</li>
				) : visibleItems.length === 0 ? (
					<li className='px-5 py-8 text-center typo-body3_regular text-neutral-400'>최근 오류가 없습니다.</li>
				) : (
					visibleItems.map((error, index) => {
						const isErrorSeverity = error.severity === 'error'
						const iconName = isErrorSeverity ? 'cancel' : 'warning'

						return (
							<li
								key={error.id}
								className={cn(
									'flex gap-3 px-5 py-3.5',
									index < visibleItems.length - 1 && 'border-b border-neutral-100'
								)}
							>
								<div
									className={cn(
										'grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
										isErrorSeverity
											? 'border-danger-300 bg-danger-100'
											: 'border-main-light-blue bg-main-light-blue'
									)}
								>
									<DashboardIcon
										name={iconName}
										size={14}
										fill={1}
										className={isErrorSeverity ? 'text-danger-600' : 'text-main-deep-blue'}
									/>
								</div>
								<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
									<div className='flex items-center gap-2'>
										<span className='font-mono typo-caption2_medium text-neutral-400'>{error.code}</span>
										<span className='ml-auto typo-caption1_regular text-neutral-400'>{error.when}</span>
									</div>
									<p className='typo-body2_semibold m-0 text-neutral-900'>{error.title}</p>
									<p className='typo-caption1_regular m-0 text-neutral-400'>{error.flow}</p>
								</div>
							</li>
						)
					})
				)}
			</ul>

			{hasMore && !resource.isLoading && !resource.isLoadingError ? (
				<button
					type='button'
					onClick={handleFooterClick}
					className='flex w-full items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3.5 typo-body2_semibold text-neutral-600 transition-colors hover:bg-neutral-100'
				>
					{footerLabel}
					<DashboardIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className='text-neutral-600' />
				</button>
			) : null}
		</DashboardCard>
	)
}

export default DashboardErrorRail
