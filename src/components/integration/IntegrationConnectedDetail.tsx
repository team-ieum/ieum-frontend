import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import { getBrandConfig } from '../../constants/integration/brandConfig'
import type { IntegrationService } from '../../types/integration'

type IntegrationConnectedDetailProps = {
	service: IntegrationService
	onBack: () => void
	onDisconnect?: () => void
	isDisconnecting?: boolean
}

const IntegrationConnectedDetail = ({
	service,
	onBack,
	onDisconnect,
	isDisconnecting = false,
}: IntegrationConnectedDetailProps) => {
	const brand = getBrandConfig(service.brand)
	const isError = service.status === 'error'

	return (
		<div className='flex flex-col gap-5'>
			<button
				type='button'
				onClick={onBack}
				className='inline-flex w-fit items-center gap-1.5 typo-body3_medium text-neutral-500 transition-colors hover:text-main-blue'
			>
				<ArrowLeft size={16} />
				연결된 서비스 목록
			</button>

			<div className='overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm'>
				<div className='flex flex-wrap items-center gap-4 px-6 py-5'>
					<span className='grid h-12 w-12 place-items-center rounded-xl bg-neutral-white text-neutral-900'>
						{brand.icon}
					</span>
					<div className='min-w-0 flex-1'>
						<h2 className='typo-title2_bold m-0 text-neutral-900'>{service.name}</h2>
						<p className='typo-body3_regular m-0 text-neutral-600'>{service.account}</p>
					</div>
					{isError && (
						<span className='rounded-full bg-danger-100 px-3 py-1 typo-caption1_semibold text-danger-700'>
							연결 오류
						</span>
					)}
					{service.origin === 'webhook' && (
						<button
							type='button'
							onClick={onDisconnect}
							disabled={isDisconnecting}
							className='inline-flex h-9 items-center gap-1.5 rounded-brand-sm border border-danger-300 bg-danger-50 px-4 typo-body3_semibold text-danger-700 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-60'
						>
							<Trash2 size={15} />
							{isDisconnecting ? '해제 중…' : '연결 해제'}
						</button>
					)}
				</div>

				{service.workflowCount !== undefined && (
					<div className='border-t border-neutral-100 px-6 py-5'>
						<dl className='m-0 flex flex-col gap-1'>
							<dt className='typo-caption1_regular text-neutral-400'>연동 워크플로우</dt>
							<dd className='typo-body2_semibold m-0 text-neutral-900'>{service.workflowCount}개</dd>
						</dl>
					</div>
				)}

				{service.scopes && service.scopes.length > 0 && (
					<div className='border-t border-neutral-100 px-6 py-5'>
						<h3 className='typo-body2_semibold m-0 mb-3 text-neutral-900'>권한 범위</h3>
						<ul className='m-0 flex flex-wrap gap-2 p-0 list-none'>
							{service.scopes.map(scope => (
								<li
									key={scope}
									className='rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono typo-caption1_medium text-neutral-600'
								>
									{scope}
								</li>
							))}
						</ul>
					</div>
				)}

				{isError && (
					<div className='border-t border-neutral-100 px-6 py-4'>
						<div className='rounded-brand-sm border border-danger-300 bg-danger-50 px-4 py-3 typo-body3_regular text-danger-700'>
							API 키가 만료되었거나 권한이 변경되었습니다. 재연결 후 워크플로우가 정상 동작합니다.
						</div>
					</div>
				)}

				{isError && (
					<div className='flex flex-wrap gap-2 border-t border-neutral-100 px-6 py-4'>
						<button
							type='button'
							className='inline-flex h-9 items-center gap-1.5 rounded-brand-sm border border-neutral-200 bg-neutral-white px-4 typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue'
						>
							<RefreshCw size={15} />
							재연결
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

export default IntegrationConnectedDetail
