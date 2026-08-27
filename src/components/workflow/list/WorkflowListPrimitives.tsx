import { ArrowRight, History, Rocket, Sparkles, Webhook, type LucideIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import {
	WORKFLOW_CATEGORY_META,
	WORKFLOW_SERVICE_META,
	WORKFLOW_STATUS_META,
	WORKFLOW_TRIGGER_META,
} from '@/constants/workflow/workflowList'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import type { IntegrationBrand } from '@/types/integration'
import type { WorkflowCategoryId, WorkflowServiceId, WorkflowStatus, WorkflowTriggerType } from '@/types/workflowList'
import { cn } from '@/utils/cn'

const SQUARE_SIZE_CLASS: Record<number, string> = {
	7: 'w-[7px] h-[7px]',
	8: 'w-2 h-2',
	16: 'w-4 h-4',
	18: 'w-[18px] h-[18px]',
	24: 'w-6 h-6',
	28: 'w-7 h-7',
}

type ServiceLogoProps = {
	id: WorkflowServiceId
	size?: number
	className?: string
}

export const ServiceLogo = ({ id, size = 28, className }: ServiceLogoProps): ReactElement => {
	const brand = getBrandConfig(id as IntegrationBrand)
	const service = WORKFLOW_SERVICE_META[id]

	return (
		<span
			className={cn(
				'grid shrink-0 place-items-center overflow-hidden rounded-md bg-white',
				SQUARE_SIZE_CLASS[size],
				className
			)}
			title={service.name}
			aria-label={service.name}
		>
			<span className='flex h-[85%] w-[85%] items-center justify-center [&_img]:!h-full [&_img]:!w-full [&_img]:object-contain'>
				{brand.icon}
			</span>
		</span>
	)
}

type ServiceChainProps = {
	services: WorkflowServiceId[]
	size?: number
	max?: number
	showArrow?: boolean
}

export const ServiceChain = ({ services, size = 28, max = 4, showArrow = true }: ServiceChainProps): ReactElement => {
	const visibleServices = services.slice(0, max)
	const overflowCount = services.length - visibleServices.length

	return (
		<div className='flex min-w-0 items-center gap-1.5'>
			{visibleServices.map((serviceId, index) => (
				<div key={`${serviceId}-${index}`} className='flex shrink-0 items-center gap-1.5'>
					<ServiceLogo id={serviceId} size={size} />
					{showArrow && index < visibleServices.length - 1 && <ArrowRight size={14} className='text-neutral-400' />}
				</div>
			))}
			{overflowCount > 0 && (
				<span
					className={cn(
						'grid shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-100 text-[11px] font-bold text-neutral-500',
						SQUARE_SIZE_CLASS[size]
					)}
				>
					+{overflowCount}
				</span>
			)}
		</div>
	)
}

type StatusDotProps = {
	status: WorkflowStatus
	size?: number
}

export const StatusDot = ({ status, size = 8 }: StatusDotProps): ReactElement => {
	const statusMeta = WORKFLOW_STATUS_META[status]

	return (
		<span
			className={cn(
				'inline-block shrink-0 rounded-full',
				statusMeta.dotBgClass,
				SQUARE_SIZE_CLASS[size],
				statusMeta.dotRingClass
			)}
		/>
	)
}

type StatusBadgeProps = {
	status: WorkflowStatus
	withDot?: boolean
}

export const StatusBadge = ({ status, withDot = true }: StatusBadgeProps): ReactElement => {
	const statusMeta = WORKFLOW_STATUS_META[status]

	return (
		<span
			className={cn(
				'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 typo-caption1_semibold',
				statusMeta.toneClass
			)}
		>
			{withDot && <StatusDot status={status} size={7} />}
			{statusMeta.label}
		</span>
	)
}

type CategoryPillProps = {
	category: WorkflowCategoryId
	count?: number
}

export const CategoryPill = ({ category, count }: CategoryPillProps): ReactElement => {
	const categoryMeta = WORKFLOW_CATEGORY_META[category]

	return (
		<span className='inline-flex h-7 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 typo-caption1_medium text-neutral-600'>
			<span className={cn('h-2 w-2 rounded-[3px]', categoryMeta.dotClass)} />
			{categoryMeta.label}
			{count != null && <span className='text-neutral-400'>{count}</span>}
		</span>
	)
}

const TRIGGER_ICON: Record<WorkflowTriggerType, LucideIcon> = {
	schedule: History,
	webhook: Webhook,
	event: Sparkles,
	manual: Rocket,
}

type TriggerPillProps = {
	trigger: WorkflowTriggerType
}

export const TriggerPill = ({ trigger }: TriggerPillProps): ReactElement => {
	const Icon = TRIGGER_ICON[trigger]

	return (
		<span className='inline-flex items-center gap-1.5 typo-caption1_regular text-neutral-500'>
			<Icon size={14} />
			{WORKFLOW_TRIGGER_META[trigger].label}
		</span>
	)
}

type WorkflowTagChipProps = {
	children: string
}

export const WorkflowTagChip = ({ children }: WorkflowTagChipProps): ReactElement => (
	<span className='inline-flex h-6 items-center rounded-full bg-neutral-100 px-2 typo-caption1_regular text-neutral-600'>
		#{children}
	</span>
)
