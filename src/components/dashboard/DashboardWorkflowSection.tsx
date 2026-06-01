import DashboardStatusPill from '@/components/dashboard/DashboardStatusPill'
import type { DashboardWorkflowSummary } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import DashboardIcon from './DashboardIcon'

type DashboardWorkflowSectionProps = {
	workflow: DashboardWorkflowSummary
	isLoading: boolean
	isError: boolean
}

const DashboardWorkflowSection = ({ workflow, isLoading, isError }: DashboardWorkflowSectionProps) => (
	<section className={cn('flex flex-col gap-4', isLoading && 'opacity-60')}>
		{isError && (
			<p className='m-0 rounded-brand-sm border border-danger-200 bg-danger-50 px-3 py-2 typo-caption1_medium text-danger-700'>
				워크플로우 현황을 불러오지 못했습니다.
			</p>
		)}
		<header className='flex items-center gap-2'>
			<DashboardIcon name='monitoring' size={18} className='text-main-blue' />
			<h2 className='typo-title3_semibold m-0 text-neutral-900'>전체 워크플로우 현황</h2>
			<aside className='ml-auto'>
				<span className='typo-caption1_medium text-neutral-400'>총 {workflow.totalCount}개 워크플로우</span>
			</aside>
		</header>
		<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
			{workflow.pills.map(pill => (
				<DashboardStatusPill key={pill.tone} {...pill} />
			))}
		</div>
	</section>
)

export default DashboardWorkflowSection
