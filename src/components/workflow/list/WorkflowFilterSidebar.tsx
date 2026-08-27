import { Cable, Check, ChevronDown, Circle, ListFilter, Tag, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactElement, type ReactNode } from 'react'
import {
	WORKFLOW_CATEGORIES,
	WORKFLOW_SERVICES,
	WORKFLOW_STATUS_META,
	WORKFLOW_STATUS_ORDER,
} from '@/constants/workflow/workflowList'
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

type FilterSectionId = 'services' | 'categories' | 'status'

type FilterGroupProps = {
	icon: ReactNode
	title: string
	open: boolean
	onToggle: () => void
	children: ReactNode
}

const FilterGroup = ({ icon, title, open, onToggle, children }: FilterGroupProps): ReactElement => (
	<section className='border-b border-neutral-200 py-3 last:border-b-0'>
		<button
			type='button'
			onClick={onToggle}
			aria-expanded={open}
			className='flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-neutral-700 transition-colors hover:bg-neutral-50'
		>
			<span className='text-neutral-400'>{icon}</span>
			<span className='flex-1 typo-body3_semibold'>{title}</span>
			<ChevronDown
				size={16}
				className={cn('text-neutral-400 transition-transform duration-300 ease-out', open && 'rotate-180')}
			/>
		</button>
		<div className='mt-2 flex flex-col gap-1'>{children}</div>
	</section>
)

type FilterRowProps = {
	active: boolean
	label: string
	leading: ReactNode
	onClick: () => void
}

const FilterRow = ({ active, label, leading, onClick }: FilterRowProps): ReactElement => (
	<button
		type='button'
		onClick={onClick}
		aria-pressed={active}
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
	</button>
)

type AnimatedFilterRowProps = FilterRowProps

const AnimatedFilterRow = (rowProps: AnimatedFilterRowProps): ReactElement => (
	<motion.div
		layout
		initial={false}
		animate={{ opacity: 1, height: 'auto' }}
		exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
		transition={{
			layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
			opacity: { duration: 0.2 },
			height: { duration: 0.28 },
		}}
	>
		<FilterRow {...rowProps} />
	</motion.div>
)

const WorkflowFilterSidebar = ({
	filters,
	serviceCounts,
	activeFilterCount,
	onToggleService,
	onToggleCategory,
	onToggleStatus,
	onClearFilters,
}: WorkflowFilterSidebarProps): ReactElement => {
	const [openSection, setOpenSection] = useState<FilterSectionId | null>('services')

	const handleSectionToggle = (section: FilterSectionId) => {
		setOpenSection(prev => (prev === section ? null : section))
	}

	const sortedServices = [...WORKFLOW_SERVICES].sort((a, b) => serviceCounts[b.id] - serviceCounts[a.id])
	const visibleServices =
		openSection === 'services' ? sortedServices : sortedServices.filter(service => filters.services.includes(service.id))

	const visibleCategories =
		openSection === 'categories'
			? WORKFLOW_CATEGORIES
			: WORKFLOW_CATEGORIES.filter(category => filters.categories.includes(category.id))

	const visibleStatuses =
		openSection === 'status'
			? WORKFLOW_STATUS_ORDER
			: WORKFLOW_STATUS_ORDER.filter(status => filters.statuses.includes(status))

	return (
		<aside className='flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)] lg:sticky lg:top-[calc(var(--layout-header-height)+1.5rem)] lg:max-h-[calc(100vh-var(--layout-header-height)-3rem)]'>
			{/* 필터 헤더 — 사이드바 내부 스크롤과 분리되어 고정 */}
			<div className='flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3'>
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

			<div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
				{/* 서비스 */}
				<FilterGroup
					icon={<Cable size={16} />}
					title='사용 서비스'
					open={openSection === 'services'}
					onToggle={() => handleSectionToggle('services')}
				>
					<AnimatePresence initial={false} mode='popLayout'>
						{visibleServices.map(service => (
							<AnimatedFilterRow
								key={service.id}
								active={filters.services.includes(service.id)}
								label={service.name}
								leading={<ServiceLogo id={service.id} size={18} />}
								onClick={() => onToggleService(service.id)}
							/>
						))}
					</AnimatePresence>
				</FilterGroup>

				{/* 카테고리 */}
				<FilterGroup
					icon={<Tag size={16} />}
					title='카테고리'
					open={openSection === 'categories'}
					onToggle={() => handleSectionToggle('categories')}
				>
					<AnimatePresence initial={false} mode='popLayout'>
						{visibleCategories.map(category => (
							<AnimatedFilterRow
								key={category.id}
								active={filters.categories.includes(category.id)}
								label={category.label}
								leading={<span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', category.dotClass)} />}
								onClick={() => onToggleCategory(category.id)}
							/>
						))}
					</AnimatePresence>
				</FilterGroup>

				{/* 상태 */}
				<FilterGroup
					icon={<Circle size={16} />}
					title='상태'
					open={openSection === 'status'}
					onToggle={() => handleSectionToggle('status')}
				>
					<AnimatePresence initial={false} mode='popLayout'>
						{visibleStatuses.map(status => (
							<AnimatedFilterRow
								key={status}
								active={filters.statuses.includes(status)}
								label={WORKFLOW_STATUS_META[status].label}
								leading={<StatusDot status={status} />}
								onClick={() => onToggleStatus(status)}
							/>
						))}
					</AnimatePresence>
				</FilterGroup>
			</div>
		</aside>
	)
}

export default WorkflowFilterSidebar
