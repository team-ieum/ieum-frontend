import { cn } from '@/utils/cn'
import type { IntegrationTabId, IntegrationView } from '@/types/integration'

const TABS: { id: IntegrationTabId; label: string }[] = [
	{ id: 'connected', label: '연결됨' },
	{ id: 'available', label: '사용 가능' },
]

type IntegrationTabsProps = {
	active: IntegrationTabId
	onChange: (tab: IntegrationTabId) => void
	view: IntegrationView
	connectedCount: number
	availableCount: number
}

const IntegrationTabs = ({ active, onChange, view, connectedCount, availableCount }: IntegrationTabsProps) => (
	<div className='flex flex-wrap items-end gap-5 border-b border-neutral-200 bg-neutral-white px-6 pt-5'>
		<div className='flex gap-1'>
			{TABS.map(tab => (
				<button
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
		<p className='pb-3.5 typo-caption1_regular text-neutral-500'>
			{view.kind === 'list' ? `연결됨 ${connectedCount}개 · 사용 가능 ${availableCount}개` : '연결된 서비스 / 상세 보기'}
		</p>
	</div>
)

export default IntegrationTabs
