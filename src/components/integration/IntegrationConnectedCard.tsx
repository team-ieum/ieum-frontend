import { AlertTriangle, ChevronRight } from 'lucide-react'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import type { IntegrationService } from '@/types/integration'
import { cn } from '@/utils/cn'

type IntegrationConnectedCardProps = {
	service: IntegrationService
	onManage: () => void
}

const STATUS_LABEL = {
	connected: { text: '연결됨', className: 'bg-main-light-blue text-main-deep-blue' },
	error: { text: '오류', className: 'bg-danger-100 text-danger-700' },
	expired: { text: '만료됨', className: 'bg-neutral-100 text-neutral-600' },
} as const

const IntegrationConnectedCard = ({ service, onManage }: IntegrationConnectedCardProps) => {
	const brand = getBrandConfig(service.brand)
	const statusKey = service.status === 'available' ? 'connected' : service.status
	const status = STATUS_LABEL[statusKey as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.connected

	return (
		<article
			className='flex h-full w-full min-w-0 flex-col overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm transition-shadow hover:shadow-md'
			style={{ background: `linear-gradient(180deg, ${brand.tint} 0%, #fff 42%)` }}
		>
			<div className='flex items-start gap-3 p-4'>
				<span
					className='grid h-10 w-10 shrink-0 place-items-center rounded-xl'
					style={{ background: brand.bg, color: brand.fg }}
				>
					{brand.icon}
				</span>
				<div className='min-w-0 flex-1'>
					<h3 className='typo-body2_semibold m-0 truncate text-neutral-900'>{service.name}</h3>
					<p className='typo-caption1_regular m-0 truncate text-neutral-500'>{service.account}</p>
				</div>
				<span
					className={cn(
						'inline-flex items-center gap-1 rounded-full px-2 py-0.5 typo-caption1_semibold',
						status.className
					)}
				>
					{service.status === 'error' && <AlertTriangle size={12} />}
					{status.text}
				</span>
			</div>

			<div className='flex items-center justify-between border-t border-neutral-100 px-4 py-3'>
				<span className='typo-caption1_regular text-neutral-400'>연동 워크플로우</span>
				<span className='typo-body3_semibold text-neutral-800'>{service.workflowCount ?? 0}개</span>
			</div>

			<div className='mt-auto px-4 pb-4 pt-1'>
				<button
					type='button'
					onClick={onManage}
					className='inline-flex h-9 w-full items-center justify-center gap-1 rounded-brand-sm border border-neutral-200 bg-neutral-white typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue'
				>
					관리
					<ChevronRight size={14} />
				</button>
			</div>
		</article>
	)
}

export default IntegrationConnectedCard
