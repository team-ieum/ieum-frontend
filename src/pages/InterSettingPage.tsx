import IntegrationConnectedDetail from '../components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '../components/integration/IntegrationListBody'
import IntegrationSettingLayout from '../components/integration/IntegrationSettingLayout'
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
		<IntegrationSettingLayout
			active={activeTab}
			onChange={handleTabChange}
			view={view}
			connectedCount={connectedCount}
			availableCount={availableCount}
		>
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
		</IntegrationSettingLayout>
	)
}

export default InterSettingPage
