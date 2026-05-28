import { Plus } from 'lucide-react'
import { getBrandConfig } from '../../constants/integration/brandConfig'
import type { IntegrationService } from '../../types/integration'

type IntegrationAvailableTileProps = {
	service: IntegrationService
	onConnect: (id: string) => void
}

const IntegrationAvailableTile = ({ service, onConnect }: IntegrationAvailableTileProps) => {
	const brand = getBrandConfig(service.brand)

	return (
		<article className='flex h-full w-full min-w-0 flex-col gap-3 rounded-brand-md border border-neutral-200 bg-neutral-white p-4 transition-shadow hover:shadow-sm'>
			<div className='flex items-start gap-3'>
				<span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-white text-neutral-900'>
					{brand.icon}
				</span>
				<div className='min-w-0 flex-1'>
					<h3 className='typo-body3_semibold m-0 text-neutral-900'>{service.name}</h3>
					<p className='typo-caption1_regular mt-0.5 line-clamp-2 text-neutral-500'>{service.desc}</p>
				</div>
			</div>
			<button
				type='button'
				onClick={() => onConnect(service.id)}
				className='mt-auto inline-flex h-8 w-full items-center justify-center gap-1 rounded-brand-sm border border-neutral-200 bg-neutral-50 typo-caption1_semibold text-neutral-700 transition-colors hover:border-main-blue hover:bg-main-light-blue hover:text-main-blue'
			>
				<Plus size={14} />
				연결하기
			</button>
		</article>
	)
}

export default IntegrationAvailableTile
