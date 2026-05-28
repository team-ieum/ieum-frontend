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
	availableSectionRef?: RefObject<HTMLElement | null>
}

const IntegrationListBody = ({ connected, available, onManage, availableSectionRef }: IntegrationListBodyProps) => (
	<div className={cn('w-full py-6 pb-10', INTEGRATION_PAGE_X)}>
		<IntegrationSectionHeading
			label='연결된 서비스'
			count={connected.length}
			desc='활성화된 자동화의 트리거 / 액션이 이 서비스들을 통해 흐릅니다.'
		/>
		<div className={cn('mt-3.5 mb-9 items-stretch', INTEGRATION_CARD_GRID)}>
			{connected.map(service => (
				<IntegrationConnectedCard key={service.id} service={service} onManage={() => onManage(service.id)} />
			))}
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
				{available.map(service => (
					<IntegrationAvailableTile key={service.id} service={service} />
				))}
			</div>
		</section>
	</div>
)

export default IntegrationListBody
