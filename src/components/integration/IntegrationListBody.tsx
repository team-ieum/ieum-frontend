import { INTEGRATION_CARD_GRID, INTEGRATION_PAGE_X } from '../../constants/integration/layout'
import type { RefObject } from 'react'
import type { IntegrationService } from '../../types/integration'
import { cn } from '../../utils/cn'
import IntegrationAvailableTile from './IntegrationAvailableTile'
import IntegrationConnectedCard from './IntegrationConnectedCard'
import IntegrationSectionHeading from './IntegrationSectionHeading'

type IntegrationListBodyProps = {
	connected: IntegrationService[]
	available: IntegrationService[]
	onManage: (id: string) => void
	onConnect: (id: string) => void
	isConnectedLoading?: boolean
	isConnectedError?: boolean
	availableSectionRef?: RefObject<HTMLElement | null>
}

const IntegrationListBody = ({
	connected,
	available,
	onManage,
	onConnect,
	isConnectedLoading = false,
	isConnectedError = false,
	availableSectionRef,
}: IntegrationListBodyProps) => (
	<div className={cn('w-full py-6 pb-10', INTEGRATION_PAGE_X)}>
		<IntegrationSectionHeading
			label='연결된 서비스'
			count={connected.length}
			desc='웹훅(Slack, Discord) 및 Google OAuth 연동입니다.'
		/>
		<div className={cn('mt-3.5 mb-9 items-stretch', INTEGRATION_CARD_GRID)}>
			{isConnectedLoading ? (
				<p className='col-span-full m-0 py-8 text-center typo-body3_regular text-neutral-500'>
					연결된 서비스를 불러오는 중…
				</p>
			) : isConnectedError ? (
				<p className='col-span-full m-0 py-8 text-center typo-body3_regular text-danger-700'>
					연결된 서비스 목록을 불러오지 못했습니다.
				</p>
			) : connected.length === 0 ? (
				<p className='col-span-full m-0 py-8 text-center typo-body3_regular text-neutral-500'>
					연결된 서비스가 없습니다.
				</p>
			) : (
				connected.map(service => (
					<IntegrationConnectedCard key={service.id} service={service} onManage={() => onManage(service.id)} />
				))
			)}
		</div>

		<section
			ref={availableSectionRef}
			id='integration-available'
			className='w-full scroll-mt-(--layout-header-height)'
			aria-labelledby='integration-available-heading'
		>
			<IntegrationSectionHeading
				headingId='integration-available-heading'
				label='사용 가능한 서비스'
				count={available.length}
				desc='검증된 통합 모듈. 클릭 한 번으로 인증을 시작할 수 있습니다.'
			/>
			<div className={cn('mt-3.5 items-stretch', INTEGRATION_CARD_GRID)}>
				{available.length === 0 ? (
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
