import { PILL_SKINS } from '../../constants/dashboard/pillSkins'
import { useWorkflowStatusSummary } from '../../hooks/dashboard/useWorkflowStatusSummary'
import type { StatusPillItem } from '../../types/dashboard'
import DashboardIcon from './DashboardIcon'

const StatusPill = ({ label, value, sub, tone }: StatusPillItem) => {
	const skin = PILL_SKINS[tone]
	return (
		<article
			className={`flex items-center gap-3.5 rounded-brand-md border px-4 py-4 transition-shadow hover:shadow-sm ${skin.wrap}`}
		>
			<div
				className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xl font-bold tabular-nums ${skin.chip} ${skin.num}`}
			>
				{value}
			</div>
			<div className='flex min-w-0 flex-col gap-0.5'>
				<span className={`inline-flex items-center gap-1.5 typo-body2_semibold ${skin.label}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${skin.dot}`} aria-hidden />
					{label}
				</span>
				<span className='typo-caption1_regular text-neutral-400'>{sub}</span>
			</div>
		</article>
	)
}

const DashboardWorkflowSection = () => {
	const { workflow } = useWorkflowStatusSummary()

	return (
		<section className='flex flex-col gap-4'>
			<header className='flex items-center gap-2'>
				<DashboardIcon name='monitoring' size={18} className='text-main-blue' />
				<h2 className='typo-title3_semibold m-0 text-neutral-900'>전체 워크플로우 현황</h2>
				<aside className='ml-auto'>
					<span className='typo-caption1_medium text-neutral-400'>총 {workflow.totalCount}개 워크플로우</span>
				</aside>
			</header>
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
				{workflow.pills.map(pill => (
					<StatusPill key={pill.tone} {...pill} />
				))}
			</div>
		</section>
	)
}

export default DashboardWorkflowSection
