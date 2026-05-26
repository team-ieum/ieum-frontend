import { ArrowRight } from 'lucide-react'
import {
	WORKFLOW_CATEGORY_META,
	WORKFLOW_SERVICE_META,
	WORKFLOW_STATUS_META,
	WORKFLOW_TRIGGER_META,
} from '@/constants/workflow/workflowList'
import type {
	WorkflowCategoryId,
	WorkflowListItem,
	WorkflowServiceId,
	WorkflowStatus,
	WorkflowTriggerType,
} from '@/types/workflowList'
import { cn } from '@/utils/cn'

type ServiceLogoProps = {
	id: WorkflowServiceId
	size?: number
	className?: string
}

export const ServiceLogo = ({ id, size = 28, className }: ServiceLogoProps) => {
	const service = WORKFLOW_SERVICE_META[id]

	return (
		<span
			className={cn(
				'grid shrink-0 place-items-center rounded-lg font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]',
				className
			)}
			style={{
				width: size,
				height: size,
				backgroundColor: service.color,
				color: service.foreground,
				fontSize: size <= 22 ? 10 : 12,
				lineHeight: 1,
			}}
			title={service.name}
			aria-label={service.name}
		>
			{service.initial}
		</span>
	)
}

type ServiceChainProps = {
	services: WorkflowServiceId[]
	size?: number
	max?: number
	showArrow?: boolean
}

export const ServiceChain = ({ services, size = 28, max = 4, showArrow = true }: ServiceChainProps) => {
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
					className='grid shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-100 text-[11px] font-bold text-neutral-500'
					style={{ width: size, height: size }}
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

export const StatusDot = ({ status, size = 8 }: StatusDotProps) => {
	const statusMeta = WORKFLOW_STATUS_META[status]

	return (
		<span
			className='inline-block shrink-0 rounded-full'
			style={{
				width: size,
				height: size,
				backgroundColor: statusMeta.dotColor,
				boxShadow: status === 'active' ? `0 0 0 3px ${statusMeta.dotColor}22` : undefined,
			}}
		/>
	)
}

type StatusBadgeProps = {
	status: WorkflowStatus
	withDot?: boolean
}

export const StatusBadge = ({ status, withDot = true }: StatusBadgeProps) => {
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

export const CategoryPill = ({ category, count }: CategoryPillProps) => {
	const categoryMeta = WORKFLOW_CATEGORY_META[category]

	return (
		<span className='inline-flex h-7 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 typo-caption1_medium text-neutral-600'>
			<span className='h-2 w-2 rounded-[3px]' style={{ backgroundColor: categoryMeta.color }} />
			{categoryMeta.label}
			{count != null && <span className='text-neutral-400'>{count}</span>}
		</span>
	)
}

type TriggerPillProps = {
	trigger: WorkflowTriggerType
}

export const TriggerPill = ({ trigger }: TriggerPillProps) => {
	const triggerMeta = WORKFLOW_TRIGGER_META[trigger]
	const Icon = triggerMeta.icon

	return (
		<span className='inline-flex items-center gap-1.5 typo-caption1_regular text-neutral-500'>
			<Icon size={14} />
			{triggerMeta.label}
		</span>
	)
}

type WorkflowTagChipProps = {
	children: string
}

export const WorkflowTagChip = ({ children }: WorkflowTagChipProps) => (
	<span className='inline-flex h-6 items-center rounded-full bg-neutral-100 px-2 typo-caption1_regular text-neutral-600'>
		#{children}
	</span>
)

const createSparklineValues = (workflow: WorkflowListItem) => {
	let hash = 0

	for (let index = 0; index < workflow.id.length; index += 1) {
		hash = (hash * 31 + workflow.id.charCodeAt(index)) & 0xffff
	}

	const base = Math.max(1, workflow.runs / 30)

	return Array.from({ length: 7 }, (_, index) => {
		hash = (hash * 9301 + 49297) & 0xffff
		const noise = (hash % 1000) / 1000
		let value = base * (0.45 + noise * 1.3)

		if (workflow.status === 'paused' && index > 3) {
			value = 0
		}

		if (workflow.status === 'error' && index === 6) {
			value = base * 0.15
		}

		return Math.max(0, value)
	})
}

const getSuccessColor = (workflow: WorkflowListItem) => {
	if (workflow.status === 'error') {
		return '#EC2D30'
	}

	if (workflow.status === 'paused') {
		return '#959595'
	}

	if (workflow.success >= 99) {
		return '#006A4E'
	}

	if (workflow.success >= 95) {
		return '#007BA7'
	}

	return '#B58900'
}

type WorkflowSparklineProps = {
	workflow: WorkflowListItem
	width?: number
	height?: number
}

export const WorkflowSparkline = ({ workflow, width = 72, height = 24 }: WorkflowSparklineProps) => {
	const values = createSparklineValues(workflow)
	const max = Math.max(1, ...values)
	const stepX = values.length > 1 ? width / (values.length - 1) : width
	const points = values.map((value, index) => [index * stepX, height - (value / max) * (height - 4) - 2])
	const path = `M ${points.map(point => point.map(value => value.toFixed(1)).join(' ')).join(' L ')}`
	const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`
	const color = getSuccessColor(workflow)
	const lastPoint = points[points.length - 1]

	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className='shrink-0' aria-hidden='true'>
			<path d={areaPath} fill={color} fillOpacity='0.13' />
			<path d={path} stroke={color} strokeWidth='1.7' fill='none' strokeLinejoin='round' strokeLinecap='round' />
			{lastPoint && <circle cx={lastPoint[0]} cy={lastPoint[1]} r='2.4' fill={color} />}
		</svg>
	)
}
