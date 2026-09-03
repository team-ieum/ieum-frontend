import SkeletonPulse from '@/components/common/SkeletonPulse'
import { INTEGRATION_PAGE_X } from '../../constants/integration/layout'
import { INTEGRATION_TABS } from '../../constants/integration/statusLabels'
import type { IntegrationTabId, IntegrationView } from '../../types/integration'
import { cn } from '../../utils/cn'

type IntegrationTabsProps = {
	active: IntegrationTabId
	onChange: (tab: IntegrationTabId) => void
	view: IntegrationView
	connectedCount: number
	availableCount: number
	isCountPending: boolean
	onButtonRef: (tab: IntegrationTabId, element: HTMLButtonElement | null) => void
}

const IntegrationTabs = ({
	active,
	onChange,
	view,
	connectedCount,
	availableCount,
	isCountPending,
	onButtonRef,
}: IntegrationTabsProps) => (
	<div
		className={cn(
			INTEGRATION_PAGE_X,
			'sticky top-(--layout-header-height) z-10',
			'flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-neutral-white pt-5 pb-4'
		)}
	>
		<div className='flex gap-1'>
			{INTEGRATION_TABS.map(tab => (
				<button
					ref={element => onButtonRef(tab.id, element)}
					key={tab.id}
					type='button'
					onClick={() => onChange(tab.id)}
					className={cn(
						'rounded-full px-4 py-2 typo-body3_semibold transition-colors',
						active === tab.id
							? 'bg-main-deep-blue text-neutral-white'
							: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
					)}
				>
					{tab.label}
				</button>
			))}
		</div>
		{view.kind === 'list' && isCountPending ? (
			<SkeletonPulse as='span' className='h-4 w-40 rounded bg-neutral-200' />
		) : (
			<p className='m-0 typo-caption1_regular text-neutral-500'>
				{view.kind === 'list'
					? `연결됨 ${connectedCount}개 · 사용 가능 ${availableCount}개`
					: '연결된 서비스 / 상세 보기'}
			</p>
		)}
	</div>
)

export default IntegrationTabs
