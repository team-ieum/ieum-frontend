import type { DashboardExpandableListState, ErrorRow } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import DashboardCard from './DashboardCard'
import DashboardIcon from './DashboardIcon'

type DashboardErrorRailProps = {
	errors: DashboardExpandableListState<ErrorRow> & { errorCount: number }
}

const DashboardErrorRail = ({ errors }: DashboardErrorRailProps) => {
	const { visibleItems, errorCount, hasMore, isExpanded, isLoading, isError, footerLabel, handleFooterClick } = errors

	return (
		<DashboardCard className='flex w-full flex-col'>
			<div className='flex items-center justify-between border-b border-neutral-200 px-5 py-4'>
				<div className='flex items-center gap-2'>
					<DashboardIcon name='error_outline' size={16} fill={1} className='text-danger-600' />
					<h3 className='typo-body2_semibold m-0 text-neutral-900'>오류 요약</h3>
				</div>
				<span className='rounded-full border border-danger-300 bg-danger-100 px-2.5 py-0.5 typo-caption1_semibold text-danger-700'>
					{errorCount}건
				</span>
			</div>

			{isError && (
				<p className='m-0 border-b border-neutral-200 px-5 py-3 typo-caption1_medium text-danger-700'>
					오류 목록을 불러오지 못했습니다.
				</p>
			)}

			<ul>
				{isLoading && visibleItems.length === 0 ? (
					<li className='px-5 py-8 text-center typo-body3_regular text-neutral-400'>불러오는 중…</li>
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

			{hasMore && (
				<button
					type='button'
					onClick={handleFooterClick}
					className='flex w-full items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3.5 typo-body2_semibold text-neutral-600 transition-colors hover:bg-neutral-100'
				>
					{footerLabel}
					<DashboardIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className='text-neutral-600' />
				</button>
			)}
		</DashboardCard>
	)
}

export default DashboardErrorRail
