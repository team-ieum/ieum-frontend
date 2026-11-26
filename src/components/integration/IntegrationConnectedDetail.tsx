import type { Ref } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { getBrandConfig } from '@/constants/integration/brandConfig'
import type { IntegrationService } from '@/types/integration'
import IntegrationConnectionMethodBadge from './IntegrationConnectionMethodBadge'
import IntegrationDisconnectButton from './IntegrationDisconnectButton'
import OAuthDisconnectAction from './OAuthDisconnectAction'
import IntegrationServiceWorkflowList from './IntegrationServiceWorkflowList'

type IntegrationConnectedDetailProps = {
	service: IntegrationService
	onBack: () => void
	/** Notion·GitHub 확인창에서 해제를 완료하면 목록으로 돌아간다. */
	onOAuthDisconnected: () => void
	isConnectionActionPending: boolean
	/** Google·Slack·웹훅 상세에서 사용하는 공용 해제 명령. */
	onDisconnect?: () => void
	isDisconnecting?: boolean
	/** 해제 확인 전에 영향받는 워크플로우를 조회하는 중인지 */
	isCheckingDisconnect?: boolean
	/** 다시 연결할 수 있는 OAuth 연결일 때만 넘긴다. 없으면 다시 연결 버튼을 렌더하지 않는다. */
	onReconnect?: () => void
	isReconnecting?: boolean
	headingRef?: Ref<HTMLHeadingElement>
}

const IntegrationConnectedDetail = ({
	service,
	onBack,
	onOAuthDisconnected,
	isConnectionActionPending,
	onDisconnect,
	isDisconnecting = false,
	isCheckingDisconnect = false,
	onReconnect,
	isReconnecting = false,
	headingRef,
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
					<div className='flex min-w-0 grow basis-56 items-center gap-4'>
						<span className='grid h-12 w-12 place-items-center rounded-xl bg-neutral-white text-neutral-900'>
							{brand.icon}
						</span>
						<div className='min-w-0 flex-1'>
							<div className='flex flex-wrap items-center gap-2'>
								<h2 ref={headingRef} tabIndex={-1} className='typo-title2_bold m-0 text-neutral-900'>
									{service.name}
								</h2>
								{service.connectionMethod && (
									<IntegrationConnectionMethodBadge method={service.connectionMethod} />
								)}
							</div>
							<p className='typo-body3_regular m-0 wrap-anywhere text-neutral-600'>{service.account}</p>
						</div>
					</div>
					<div className='flex flex-wrap items-center gap-4 empty:hidden'>
						{isError && (
							<span className='rounded-full bg-danger-100 px-3 py-1 typo-caption1_semibold text-danger-700'>
								연결 오류
							</span>
						)}
						{onReconnect && (
							<button
								type='button'
								onClick={onReconnect}
								disabled={isConnectionActionPending}
								className='inline-flex h-9 items-center gap-1.5 rounded-brand-sm border border-neutral-300 bg-neutral-white px-4 typo-body3_semibold text-neutral-700 transition-colors hover:border-main-blue hover:text-main-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
							>
								<RefreshCw size={15} aria-hidden='true' />
								{isReconnecting ? '이동 중…' : '다시 연결'}
							</button>
						)}
						{onDisconnect ? (
							<IntegrationDisconnectButton
								onClick={onDisconnect}
								disabled={isConnectionActionPending}
								isDisconnecting={isDisconnecting}
								isCheckingDisconnect={isCheckingDisconnect}
							/>
						) : (
							<OAuthDisconnectAction
								service={service}
								disabled={isConnectionActionPending}
								onDisconnected={onOAuthDisconnected}
							/>
						)}
					</div>
				</div>

				{service.scopes && service.scopes.length > 0 && (
					<div className='border-t border-neutral-100 px-6 py-5'>
						<h3 className='typo-body2_semibold m-0 mb-3 text-neutral-900'>권한 범위</h3>
						<ul className='m-0 flex flex-wrap gap-2 p-0 list-none'>
							{service.scopes.map(scope => (
								<li
									key={scope}
									className='rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 typo-mono-caption1_medium text-neutral-600'
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
			</div>

			<IntegrationServiceWorkflowList service={service} />
		</div>
	)
}

export default IntegrationConnectedDetail
