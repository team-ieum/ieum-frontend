import { INTEGRATION_PAGE_X } from '../../constants/integration/layout'
import { cn } from '../../utils/cn'

const IntegrationPageHeader = () => (
	<div
		className={cn(
			INTEGRATION_PAGE_X,
			'flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-neutral-white py-5'
		)}
	>
		<div className='flex min-w-0 flex-col gap-1'>
			<h1 className='typo-title1_bold m-0 text-neutral-900'>통합 설정</h1>
			<p className='typo-body3_regular m-0 text-neutral-500'>외부 서비스를 연결하여 워크플로우 자동화를 구성하세요.</p>
		</div>
	</div>
)

export default IntegrationPageHeader
