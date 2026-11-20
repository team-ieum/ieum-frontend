import { Unlink2 } from 'lucide-react'
import ieumSymbol from '@/assets/symbolNoLine.png'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import type { IntegrationService } from '@/types/integration'

type IntegrationDisconnectAccountProps = {
	service: Pick<IntegrationService, 'brand' | 'name' | 'account'>
	serviceId: string
	accountId: string
}

const IntegrationDisconnectAccount = ({ service, serviceId, accountId }: IntegrationDisconnectAccountProps) => (
	<div className='min-h-0 min-w-0 overflow-y-auto border-r border-line-blue bg-main-light-blue px-4.5 py-8 text-main-deep-blue max-[600px]:flex max-[600px]:items-center max-[600px]:gap-3 max-[600px]:border-r-0 max-[600px]:border-b max-[600px]:py-1 max-[600px]:pr-12'>
		<div aria-hidden='true' className='mb-4.5 flex w-28 items-center gap-0.5 max-[600px]:hidden'>
			<span className='grid size-9 shrink-0 place-items-center rounded-brand-sm border border-line-blue bg-neutral-white'>
				<img src={ieumSymbol} alt='' className='size-5.5 object-contain' />
			</span>
			<span className='flex-1 border-t border-dashed border-main-gray' />
			<Unlink2 size={15} aria-hidden='true' />
			<span className='flex-1 border-t border-dashed border-main-gray' />
			<span className='grid size-9 shrink-0 place-items-center rounded-brand-sm border border-line-blue bg-neutral-white'>
				{getBrandConfig(service.brand).icon}
			</span>
		</div>
		<p id={serviceId} className='shrink-0 typo-heading3_bold max-[600px]:typo-title2_bold'>
			{service.name}
		</p>
		{service.account?.trim() && (
			<div
				id={accountId}
				className='mt-4.5 min-w-0 border-t border-line-blue pt-3 max-[600px]:mt-0 max-[600px]:max-h-full max-[600px]:overflow-y-auto max-[600px]:border-t-0 max-[600px]:border-l max-[600px]:pt-0 max-[600px]:pl-2.5'
			>
				<p className='mb-0.5 typo-caption1_medium text-main-gray'>연결된 계정</p>
				<p className='break-keep wrap-anywhere typo-body1_semibold max-[600px]:typo-body2_semibold'>{service.account}</p>
			</div>
		)}
	</div>
)

export default IntegrationDisconnectAccount
