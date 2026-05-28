import { AlertTriangle, ChevronRight } from 'lucide-react'
import { getBrandConfig } from '../../constants/integration/brandConfig'
import { INTEGRATION_STATUS_LABEL } from '../../constants/integration/statusLabels'
import type { IntegrationService } from '../../types/integration'
import { toConnectedDisplayStatus } from '../../utils/integration/selectors'
import { cn } from '../../utils/cn'

type IntegrationConnectedCardProps = {
	service: IntegrationService
	onManage: () => void
}

const IntegrationConnectedCard = ({ service, onManage }: IntegrationConnectedCardProps) => {
	const brand = getBrandConfig(service.brand)
	const displayStatus = toConnectedDisplayStatus(service.status)
	const status = INTEGRATION_STATUS_LABEL[displayStatus]

	return (
		<article
			className='flex h-full w-full min-w-0 flex-col overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm transition-shadow hover:shadow-md'
			style={{ background: `linear-gradient(180deg, ${brand.tint} 0%, #fff 42%)` }}
		>
			<div className='flex items-start gap-3 p-4'>
				<span className='grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-white text-neutral-900'>
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
