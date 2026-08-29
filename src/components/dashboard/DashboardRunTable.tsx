import SkeletonPulse from '@/components/common/SkeletonPulse'
import type { DashboardExpandableListState, RunRow } from '@/types/dashboard'
import DashboardCard from './DashboardCard'
import DashboardIcon from './DashboardIcon'
import DashboardStatusBadge from './DashboardStatusBadge'
import { DashboardRefreshFeedback, DashboardResourceStatus } from './DashboardAsyncState'

const TABLE_HEADERS = ['실행 ID', '워크플로우', '상태', '소요 시간', '트리거', '시각'] as const

type DashboardRunTableProps = {
	runs: DashboardExpandableListState<RunRow>
}

type DashboardTriggerChipProps = {
	kind: string
}

const TriggerChip = ({ kind }: DashboardTriggerChipProps) => (
	<span className='inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 typo-caption1_medium text-neutral-600'>
		{kind}
	</span>
)

const DashboardRunTable = ({ runs }: DashboardRunTableProps) => {
	const { visibleItems, hasMore, isExpanded, resource, footerLabel, handleFooterClick } = runs

	return (
		<DashboardCard className='min-h-[319px] w-full' aria-busy={resource.isLoading || resource.isRefetching}>
			<DashboardResourceStatus
				{...resource}
				loadingMessage='최근 실행 로그 불러오는 중'
				errorMessage='최근 실행 로그를 불러오지 못했습니다. 다시 시도할 수 있습니다.'
			/>
			<div className='flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4'>
				<h3 className='typo-body2_semibold m-0 text-neutral-900'>최근 실행 로그</h3>
				<DashboardRefreshFeedback {...resource} />
			</div>

			{resource.isRefetchError ? (
				<p className='m-0 border-b border-neutral-200 px-5 py-3 typo-caption1_medium text-danger-700'>
					기존 실행 로그를 표시하고 있습니다.
				</p>
			) : null}

			<div className='overflow-x-auto'>
				<table className='w-full min-w-[720px] border-collapse'>
					<thead>
						<tr className='bg-neutral-50'>
							{TABLE_HEADERS.map(header => (
								<th
									key={header}
									className='border-b border-neutral-200 px-5 py-2.5 text-left typo-caption1_semibold tracking-wide text-neutral-400'
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{resource.isLoading ? (
							Array.from({ length: 5 }, (_, index) => (
								<tr key={index} aria-hidden='true' className='border-b border-neutral-100 last:border-b-0'>
									{TABLE_HEADERS.map(header => (
										<td key={header} className='px-5 py-3.5'>
											<SkeletonPulse className='h-4 rounded bg-neutral-200' />
										</td>
									))}
								</tr>
							))
						) : resource.isLoadingError ? (
							<tr>
								<td
									colSpan={TABLE_HEADERS.length}
									className='px-5 py-8 text-center typo-body3_regular text-neutral-400'
								>
									<p className='m-0 text-danger-700'>실행 로그를 불러오지 못했습니다.</p>
									<button
										type='button'
										onClick={resource.retry}
										className='mt-3 rounded-brand-sm border border-danger-300 bg-neutral-white px-3 py-1.5 typo-caption1_semibold text-danger-700'
									>
										다시 시도
									</button>
								</td>
							</tr>
						) : visibleItems.length === 0 ? (
							<tr>
								<td
									colSpan={TABLE_HEADERS.length}
									className='px-5 py-8 text-center typo-body3_regular text-neutral-400'
								>
									최근 실행 이력이 없습니다.
								</td>
							</tr>
						) : (
							visibleItems.map(run => (
								<tr
									key={run.id}
									className='border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/80'
								>
									<td className='px-5 py-3.5 align-middle font-mono typo-body3_medium text-neutral-600'>
										{run.displayId}
									</td>
									<td className='px-5 py-3.5 align-middle typo-body2_regular text-neutral-900'>{run.name}</td>
									<td className='px-5 py-3.5 align-middle'>
										<DashboardStatusBadge status={run.status} />
									</td>
									<td className='px-5 py-3.5 align-middle font-mono typo-body3_medium text-neutral-600'>
										{run.time}
									</td>
									<td className='px-5 py-3.5 align-middle'>
										<TriggerChip kind={run.trigger} />
									</td>
									<td className='px-5 py-3.5 align-middle typo-caption1_regular text-neutral-400'>
										{run.when}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

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

export default DashboardRunTable
