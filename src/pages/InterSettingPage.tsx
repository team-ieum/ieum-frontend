import { useMemo, useState } from 'react'
import IntegrationConnectedDetail from '@/components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '@/components/integration/IntegrationListBody'
import IntegrationPageHeader from '@/components/integration/IntegrationPageHeader'
import IntegrationTabs from '@/components/integration/IntegrationTabs'
import { INTEGRATION_SERVICES } from '@/mocks/integration/integrationMock'
import type { IntegrationTabId, IntegrationView } from '@/types/integration'

const InterSettingPage = () => {
	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')

	const connected = useMemo(() => INTEGRATION_SERVICES.filter(s => s.status !== 'available'), [])
	const available = useMemo(() => INTEGRATION_SERVICES.filter(s => s.status === 'available'), [])

	const currentService = view.kind === 'detail' ? INTEGRATION_SERVICES.find(s => s.id === view.id) : undefined

	const goDetail = (id: string) => setView({ kind: 'detail', id })
	const goList = () => setView({ kind: 'list' })

	return (
		<section className='flex flex-col gap-0 overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm'>
			<IntegrationPageHeader />
			<IntegrationTabs
				active={activeTab}
				onChange={setActiveTab}
				view={view}
				connectedCount={connected.length}
				availableCount={available.length}
			/>

			<div className='bg-neutral-50'>
				{view.kind === 'list' ? (
					<IntegrationListBody connected={connected} available={available} onManage={goDetail} />
				) : currentService ? (
					<div className='mx-auto max-w-[960px] px-6 py-6 pb-9'>
						<IntegrationConnectedDetail service={currentService} onBack={goList} />
					</div>
				) : null}
			</div>
		</section>
	)
}

export default InterSettingPage
