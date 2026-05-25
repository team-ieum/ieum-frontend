import { useDashboardRunLogs } from '../../hooks/dashboard/useDashboardRunLogs'
import type { DashboardTriggerChipProps } from '../../types/dashboard'
import DashboardCard from './DashboardCard'
import DashboardIcon from './DashboardIcon'
import DashboardStatusBadge from './DashboardStatusBadge'

const TABLE_HEADERS = ['실행 ID', '워크플로우', '상태', '소요 시간', '트리거', '시각'] as const

const TriggerChip = ({ kind }: DashboardTriggerChipProps) => (
	<span className='inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 typo-caption1_medium text-neutral-600'>
		{kind}
	</span>
)

const DashboardRunTable = () => {
	const { visibleRuns, hasMore, isExpanded, toggleExpanded } = useDashboardRunLogs()

	return (
		<DashboardCard className='w-full'>
			<div className='border-b border-neutral-200 px-5 py-4'>
				<h3 className='typo-body2_semibold m-0 text-neutral-900'>최근 실행 로그</h3>
			</div>

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
						{visibleRuns.map(run => (
							<tr
								key={run.id}
								className='border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/80'
							>
								<td className='px-5 py-3.5 align-middle font-mono typo-body3_medium text-neutral-600'>
									{run.id}
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
								<td className='px-5 py-3.5 align-middle typo-caption1_regular text-neutral-400'>{run.when}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{hasMore && (
				<button
					type='button'
					onClick={toggleExpanded}
					className='flex w-full items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3.5 typo-body2_semibold text-neutral-600 transition-colors hover:bg-neutral-100'
				>
					{isExpanded ? '닫기' : '전체 이력 보기'}
					<DashboardIcon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className='text-neutral-600' />
				</button>
			)}
		</DashboardCard>
	)
}

export default DashboardRunTable
