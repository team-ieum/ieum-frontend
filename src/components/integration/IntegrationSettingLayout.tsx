import type { PropsWithChildren } from 'react'
import type { IntegrationTabId, IntegrationView } from '../../types/integration'
import { cn } from '../../utils/cn'
import IntegrationPageHeader from './IntegrationPageHeader'
import IntegrationTabs from './IntegrationTabs'

const IntegrationSettingLayout = ({
	children,
	active,
	onChange,
	view,
	connectedCount,
	availableCount,
	isCountPending,
}: PropsWithChildren<{
	active: IntegrationTabId
	onChange: (tab: IntegrationTabId) => void
	view: IntegrationView
	connectedCount: number
	availableCount: number
	isCountPending: boolean
}>) => (
	<div
		className={cn(
			'-mx-6 -mt-6 -mb-6 flex flex-col',
			'min-h-[calc(100vh-var(--layout-header-height))] border-y border-neutral-200 bg-neutral-white'
		)}
	>
		<IntegrationPageHeader />
		<IntegrationTabs
			active={active}
			onChange={onChange}
			view={view}
			connectedCount={connectedCount}
			availableCount={availableCount}
			isCountPending={isCountPending}
		/>
		{children}
	</div>
)

export default IntegrationSettingLayout
