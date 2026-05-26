import { Cable, Check, ChevronDown, ChevronUp, Circle, ListFilter, Tag, X } from 'lucide-react'
import { useState, type ReactElement, type ReactNode } from 'react'
import { WORKFLOW_CATEGORIES, WORKFLOW_SERVICES, WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowCategoryId, WorkflowListFilters, WorkflowServiceId, WorkflowStatus } from '@/types/workflowList'
import { cn } from '@/utils/cn'
import { ServiceLogo, StatusDot } from './WorkflowListPrimitives'

type WorkflowFilterSidebarProps = {
	filters: WorkflowListFilters
	serviceCounts: Record<WorkflowServiceId, number>
	categoryCounts: Record<WorkflowCategoryId, number>
	statusCounts: Record<WorkflowStatus, number>
	activeFilterCount: number
	onToggleService: (serviceId: WorkflowServiceId) => void
	onToggleCategory: (categoryId: WorkflowCategoryId) => void
	onToggleStatus: (status: WorkflowStatus) => void
	onClearFilters: () => void
}

type FilterGroupProps = {
	icon: ReactNode
	title: string
	count: number
	defaultOpen?: boolean
	children: ReactNode
}

const FilterGroup = ({ icon, title, count, defaultOpen = true, children }: FilterGroupProps): ReactElement => {
	const [isOpen, setIsOpen] = useState(defaultOpen)

	return (
		<section className='border-b border-neutral-200 py-3 last:border-b-0'>
			<button
				type='button'
				onClick={() => setIsOpen(prev => !prev)}
				className='flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-neutral-700 transition-colors hover:bg-neutral-50'
			>
				<span className='text-neutral-400'>{icon}</span>
				<span className='flex-1 typo-body3_semibold'>{title}</span>
				<span className='typo-caption1_regular text-neutral-400'>{count}</span>
				{isOpen ? (
					<ChevronUp size={16} className='text-neutral-400' />
				) : (
					<ChevronDown size={16} className='text-neutral-400' />
				)}
			</button>
			{isOpen && <div className='mt-2 flex flex-col gap-1'>{children}</div>}
		</section>
	)
}

type FilterRowProps = {
	active: boolean
	label: string
	count: number
	leading: ReactNode
	onClick: () => void
}

const FilterRow = ({ active, label, count, leading, onClick }: FilterRowProps): ReactElement => (
	<button
		type='button'
		onClick={onClick}
		className={cn(
			'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
			active ? 'bg-main-light-blue text-main-deep-blue' : 'text-neutral-600 hover:bg-neutral-50'
		)}
	>
		<span
			className={cn(
				'grid h-3.5 w-3.5 shrink-0 place-items-center rounded border',
				active ? 'border-main-deep-blue bg-main-deep-blue' : 'border-neutral-300 bg-white'
			)}
		>
			{active && <Check size={10} className='text-white' />}
		</span>
		{leading}
		<span className={cn('min-w-0 flex-1 truncate', active ? 'typo-body3_semibold' : 'typo-body3_regular')}>{label}</span>
		<span className='typo-caption1_regular text-neutral-400'>{count}</span>
	</button>
)

const statusOrder: WorkflowStatus[] = ['active', 'paused', 'error']

const WorkflowFilterSidebar = ({
	filters,
	serviceCounts,
	categoryCounts,
	statusCounts,
	activeFilterCount,
	onToggleService,
	onToggleCategory,
	onToggleStatus,
	onClearFilters,
}: WorkflowFilterSidebarProps): ReactElement => (
	<aside className='rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:sticky lg:top-[calc(var(--layout-header-height)+1.5rem)] lg:max-h-[calc(100vh-var(--layout-header-height)-3rem)] lg:overflow-y-auto'>
		{/* 필터 헤더 */}
		<div className='mb-1 flex items-center justify-between gap-3'>
			<div className='flex items-center gap-2'>
				<ListFilter size={17} className='text-main-deep-blue' />
				<h2 className='typo-title3_semibold text-neutral-800'>필터</h2>
			</div>
			{activeFilterCount > 0 && (
				<button
					type='button'
					onClick={onClearFilters}
					className='inline-flex items-center gap-1 rounded-lg px-2 py-1 typo-caption1_medium text-main-blue transition-colors hover:bg-main-light-blue'
				>
					<X size={13} />
					{activeFilterCount}
				</button>
			)}
		</div>

		{/* 서비스 */}
		<FilterGroup icon={<Cable size={16} />} title='사용 서비스' count={WORKFLOW_SERVICES.length}>
			{[...WORKFLOW_SERVICES]
				.sort((a, b) => serviceCounts[b.id] - serviceCounts[a.id])
				.map(service => (
					<FilterRow
						key={service.id}
						active={filters.services.includes(service.id)}
						label={service.name}
						count={serviceCounts[service.id]}
						leading={<ServiceLogo id={service.id} size={18} />}
						onClick={() => onToggleService(service.id)}
					/>
				))}
		</FilterGroup>

		{/* 카테고리 */}
		<FilterGroup icon={<Tag size={16} />} title='카테고리' count={WORKFLOW_CATEGORIES.length}>
			{WORKFLOW_CATEGORIES.map(category => (
				<FilterRow
					key={category.id}
					active={filters.categories.includes(category.id)}
					label={category.label}
					count={categoryCounts[category.id]}
					leading={<span className='h-2.5 w-2.5 shrink-0 rounded-[3px]' style={{ backgroundColor: category.color }} />}
					onClick={() => onToggleCategory(category.id)}
				/>
			))}
		</FilterGroup>

		{/* 상태 */}
		<FilterGroup icon={<Circle size={16} />} title='상태' count={statusOrder.length}>
			{statusOrder.map(status => (
				<FilterRow
					key={status}
					active={filters.statuses.includes(status)}
					label={WORKFLOW_STATUS_META[status].label}
					count={statusCounts[status]}
					leading={<StatusDot status={status} />}
					onClick={() => onToggleStatus(status)}
				/>
			))}
		</FilterGroup>
	</aside>
)

export default WorkflowFilterSidebar
