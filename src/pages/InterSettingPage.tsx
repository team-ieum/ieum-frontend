import { useEffect, useMemo, useRef, useState } from 'react'
import IntegrationConnectedDetail from '@/components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '@/components/integration/IntegrationListBody'
import IntegrationPageHeader from '@/components/integration/IntegrationPageHeader'
import IntegrationTabs from '@/components/integration/IntegrationTabs'
import { INTEGRATION_PAGE_X } from '@/constants/integration/layout'
import { INTEGRATION_SERVICES } from '@/mocks/integration/integrationMock'
import type { IntegrationTabId, IntegrationView } from '@/types/integration'
import { cn } from '@/utils/cn'

const InterSettingPage = () => {
	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')
	const availableSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAvailableRef = useRef(false)

	const connected = useMemo(() => INTEGRATION_SERVICES.filter(s => s.status !== 'available'), [])
	const available = useMemo(() => INTEGRATION_SERVICES.filter(s => s.status === 'available'), [])

	const currentService = view.kind === 'detail' ? INTEGRATION_SERVICES.find(s => s.id === view.id) : undefined

	const goDetail = (id: string) => setView({ kind: 'detail', id })
	const goList = () => setView({ kind: 'list' })

	const handleTabChange = (tab: IntegrationTabId) => {
		if (tab === 'available') {
			shouldScrollToAvailableRef.current = true
			if (view.kind === 'detail') {
				setView({ kind: 'list' })
			}
		}
		setActiveTab(tab)
	}

	useEffect(() => {
		if (!shouldScrollToAvailableRef.current || activeTab !== 'available' || view.kind !== 'list') {
			return
		}

		shouldScrollToAvailableRef.current = false
		requestAnimationFrame(() => {
			availableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}, [activeTab, view.kind])

	return (
		<section
			className={cn(
				'-mx-6 -mt-6 -mb-6 flex flex-col overflow-hidden',
				'min-h-[calc(100vh-var(--layout-header-height))] border-y border-neutral-200 bg-neutral-white'
			)}
		>
			<IntegrationPageHeader />
			<IntegrationTabs
				active={activeTab}
				onChange={handleTabChange}
				view={view}
				connectedCount={connected.length}
				availableCount={available.length}
			/>

			<div className='flex-1 bg-neutral-50'>
				{view.kind === 'list' ? (
					<IntegrationListBody
						connected={connected}
						available={available}
						onManage={goDetail}
						availableSectionRef={availableSectionRef}
					/>
				) : currentService ? (
					<div className={cn('w-full py-6 pb-9', INTEGRATION_PAGE_X)}>
						<IntegrationConnectedDetail service={currentService} onBack={goList} />
					</div>
				) : null}
			</div>
		</section>
	)
}

export default InterSettingPage
