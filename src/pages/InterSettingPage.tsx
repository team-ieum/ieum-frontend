import IntegrationConnectedDetail from '../components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '../components/integration/IntegrationListBody'
import IntegrationPageHeader from '../components/integration/IntegrationPageHeader'
import IntegrationTabs from '../components/integration/IntegrationTabs'
import { INTEGRATION_PAGE_X } from '../constants/integration/layout'
import { useIntegrationSetting } from '../hooks/integration/useIntegrationSetting'
import { cn } from '../utils/cn'

const InterSettingPage = () => {
	const {
		view,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount,
		availableCount,
		isListView,
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
	} = useIntegrationSetting()

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
				connectedCount={connectedCount}
				availableCount={availableCount}
			/>

			<div className='flex-1 bg-neutral-50'>
				{isListView ? (
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
