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
		{/* UX-06 계약: 두 섹션을 함께 유지하는 section navigation이므로 tab role을 사용하지 않는다. */}
		<nav aria-label='통합 설정 섹션' className='flex gap-1'>
			{INTEGRATION_TABS.map(tab => (
				<button
					ref={element => onButtonRef(tab.id, element)}
					key={tab.id}
					type='button'
					onClick={() => onChange(tab.id)}
					aria-current={active === tab.id ? 'true' : undefined}
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
		</nav>
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
