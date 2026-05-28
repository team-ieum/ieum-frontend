import { X } from 'lucide-react'
import type { ReactElement } from 'react'
import type { WorkflowActiveFilter } from '@/types/workflowList'
import { cn } from '@/utils/cn'
import { ServiceLogo, StatusDot } from './WorkflowListPrimitives'

type WorkflowActiveFiltersProps = {
	filters: WorkflowActiveFilter[]
	onRemove: (filter: WorkflowActiveFilter) => void
}

const WorkflowActiveFilters = ({ filters, onRemove }: WorkflowActiveFiltersProps): ReactElement | null => {
	if (filters.length === 0) {
		return null
	}

	return (
		<div className='flex flex-wrap items-center gap-1.5'>
			<span className='mr-1 typo-caption1_regular text-neutral-400'>활성 필터</span>
			{filters.map(filter => (
				<button
					key={`${filter.kind}-${filter.id}`}
					type='button'
					onClick={() => onRemove(filter)}
					className='inline-flex h-8 items-center gap-1.5 rounded-full border border-[#cde9f4] bg-main-light-blue px-2.5 typo-caption1_medium text-main-deep-blue transition-colors hover:bg-white'
				>
					{filter.serviceId && <ServiceLogo id={filter.serviceId} size={16} />}
					{filter.status && <StatusDot status={filter.status} size={7} />}
					{!filter.serviceId && !filter.status && filter.dotClass && (
						<span className={cn('h-2 w-2 rounded-[3px]', filter.dotClass)} />
					)}
					{filter.label}
					<X size={13} />
				</button>
			))}
		</div>
	)
}

export default WorkflowActiveFilters
