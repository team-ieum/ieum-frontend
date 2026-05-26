import IntegrationAvailableTile from './IntegrationAvailableTile'
import IntegrationConnectedCard from './IntegrationConnectedCard'
import IntegrationNewConnectionCard from './IntegrationNewConnectionCard'
import IntegrationSectionHeading from './IntegrationSectionHeading'
import type { IntegrationService } from '@/types/integration'

type IntegrationListBodyProps = {
	connected: IntegrationService[]
	available: IntegrationService[]
	onManage: (id: string) => void
}

const IntegrationListBody = ({ connected, available, onManage }: IntegrationListBodyProps) => (
	<div className='mx-auto max-w-[1240px] px-6 py-7 pb-12'>
		<IntegrationSectionHeading
			label='연결된 서비스'
			count={connected.length}
			desc='활성화된 자동화의 트리거 / 액션이 이 서비스들을 통해 흐릅니다.'
		/>
		<div className='mt-3.5 mb-9 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
			{connected.map(service => (
				<IntegrationConnectedCard key={service.id} service={service} onManage={() => onManage(service.id)} />
			))}
			<IntegrationNewConnectionCard />
		</div>

		<IntegrationSectionHeading
			label='사용 가능한 서비스'
			count={available.length}
			desc='검증된 통합 모듈. 클릭 한 번으로 인증을 시작할 수 있습니다.'
		/>
		<div className='mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
			{available.map(service => (
				<IntegrationAvailableTile key={service.id} service={service} />
			))}
		</div>
	</div>
)

export default IntegrationListBody
