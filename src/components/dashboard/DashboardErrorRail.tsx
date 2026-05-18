import { useDashboardErrorSummary } from '../../hooks/dashboard/useDashboardErrorSummary'
import { cn } from '../../utils/cn'
import DashboardCard from './DashboardCard'
import DashboardIcon from './DashboardIcon'

const DashboardErrorRail = () => {
	const { visibleErrors, errorCount, hasMore, isExpanded, toggleExpanded } = useDashboardErrorSummary()

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

			<ul>
				{visibleErrors.map((error, index) => {
					const isError = error.severity === 'error'
					const iconName = isError ? 'cancel' : 'warning'

					return (
						<li
							key={error.code}
							className={cn(
								'flex gap-3 px-5 py-3.5',
								index < visibleErrors.length - 1 && 'border-b border-neutral-100'
							)}
						>
							<div
								className={cn(
									'grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
									isError ? 'border-danger-300 bg-danger-100' : 'border-main-light-blue bg-main-light-blue'
								)}
							>
								<DashboardIcon
									name={iconName}
									size={14}
									fill={1}
									className={isError ? 'text-danger-600' : 'text-main-deep-blue'}
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
				})}
			</ul>

			{hasMore && (
				<button
					type='button'
					onClick={toggleExpanded}
					className='flex w-full items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3.5 typo-body2_semibold text-neutral-600 transition-colors hover:bg-neutral-100'
				>
					{isExpanded ? '닫기' : '전체 오류 이력 보기'}
					<DashboardIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className='text-neutral-600' />
				</button>
			)}
		</DashboardCard>
	)
}

export default DashboardErrorRail
