import { INTEGRATION_PAGE_X, INTEGRATION_SECTION_GRID } from '../../constants/integration/layout'
import type { IntegrationService } from '../../types/integration'
import { cn } from '../../utils/cn'
import IntegrationAvailableTile from './IntegrationAvailableTile'
import IntegrationConnectedCard from './IntegrationConnectedCard'
import IntegrationSectionHeading from './IntegrationSectionHeading'
import { IntegrationCardSkeletons, IntegrationRefreshFeedback, IntegrationSourceError } from './IntegrationAsyncState'
import type { AsyncResourceState } from '@/types/asyncResource'

type IntegrationListBodyProps = {
	connected: IntegrationService[]
	available: IntegrationService[]
	onManage: (id: string) => void
	onManageButtonRef: (id: string, element: HTMLButtonElement | null) => void
	onConnect: (id: string) => void
	canResolveAvailable: boolean
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
}

const IntegrationListBody = ({
	connected,
	available,
	onManage,
	onManageButtonRef,
	onConnect,
	canResolveAvailable,
	webhookResource,
	oauthResource,
}: IntegrationListBodyProps) => (
	<div
		className={cn('w-full py-6 pb-10', INTEGRATION_PAGE_X)}
		aria-busy={
			webhookResource.isLoading || oauthResource.isLoading || webhookResource.isRefetching || oauthResource.isRefetching
		}
	>
		<IntegrationSectionHeading
			label='연결된 서비스'
			count={connected.length}
			desc='웹훅(Slack, Discord) 및 Google OAuth 연동입니다.'
			isCountPending={!canResolveAvailable}
		/>
		<div className='mt-2'>
			<IntegrationRefreshFeedback webhookResource={webhookResource} oauthResource={oauthResource} />
		</div>
		<div className={cn(INTEGRATION_SECTION_GRID, 'mb-9')}>
			{connected.map(service => (
				<IntegrationConnectedCard
					key={service.id}
					service={service}
					onManage={() => onManage(service.id)}
					onManageButtonRef={onManageButtonRef}
				/>
			))}
			{webhookResource.isLoading || oauthResource.isLoading ? (
				<div className='col-span-full'>
					<IntegrationCardSkeletons />
				</div>
			) : connected.length === 0 && canResolveAvailable ? (
				<p className='col-span-full m-0 py-8 text-center typo-body3_regular text-neutral-500'>
					연결된 서비스가 없습니다.
				</p>
			) : null}
		</div>

		<section
			id='integration-available'
			className='w-full scroll-mt-(--layout-header-height)'
			aria-labelledby='integration-available-heading'
		>
			<IntegrationSectionHeading
				headingId='integration-available-heading'
				label='사용 가능한 서비스'
				count={available.length}
				desc='검증된 통합 모듈. 클릭 한 번으로 인증을 시작할 수 있습니다.'
				isCountPending={!canResolveAvailable}
			/>
			<div className={INTEGRATION_SECTION_GRID}>
				{webhookResource.isLoading || oauthResource.isLoading ? null : webhookResource.isLoadingError ||
				  oauthResource.isLoadingError ? (
					<IntegrationSourceError webhookResource={webhookResource} oauthResource={oauthResource} />
				) : available.length === 0 ? (
					<p className='col-span-full m-0 py-8 text-center typo-body3_regular text-neutral-500'>
						연결 가능한 서비스가 없습니다.
					</p>
				) : (
					available.map(service => (
						<IntegrationAvailableTile key={service.id} service={service} onConnect={onConnect} />
					))
				)}
			</div>
		</section>
	</div>
)

export default IntegrationListBody
