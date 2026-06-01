import IntegrationConnectedDetail from '../components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '../components/integration/IntegrationListBody'
import IntegrationSettingLayout from '../components/integration/IntegrationSettingLayout'
import { INTEGRATION_PAGE_X } from '../constants/integration/layout'
import { useIntegrationSetting } from '../hooks/integration/useIntegrationSetting'
import { useIntegrationOAuthReturn } from '../hooks/integration/useIntegrationOAuthReturn'
import { cn } from '../utils/cn'
import { useEffect } from 'react'
import { AiCredentialsSection } from '@/components/aiCredentials/AiCredentialsSection'
import WebhookCredentialConnectModal from '@/components/integration/WebhookCredentialConnectModal'

const InterSettingPage = () => {
	useIntegrationOAuthReturn()

	const {
		view,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount,
		availableCount,
		isConnectedLoading,
		isConnectedError,
		isAvailableLoading,
		isAvailableError,
		isListView,
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
		onConnect,
		webhookConnectServiceId,
		closeWebhookConnect,
	} = useIntegrationSetting()

	const isMissingDetail = !isListView && !currentService

	useEffect(() => {
		if (!isMissingDetail) return
		goList()
	}, [isMissingDetail, goList])

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
					<>
						<IntegrationListBody
							connected={connected}
							available={available}
							onManage={goDetail}
							onConnect={onConnect}
							isConnectedLoading={isConnectedLoading}
							isConnectedError={isConnectedError}
							isAvailableLoading={isAvailableLoading}
							isAvailableError={isAvailableError}
							availableSectionRef={availableSectionRef}
						/>
						<AiCredentialsSection />
					</>
				) : currentService ? (
					<div className={cn('w-full py-6 pb-9', INTEGRATION_PAGE_X)}>
						<IntegrationConnectedDetail service={currentService} onBack={goList} />
					</div>
				) : (
					<div className={cn('w-full py-10', INTEGRATION_PAGE_X)}>
						<div className='rounded-brand-md border border-neutral-200 bg-neutral-white px-6 py-5'>
							<p className='m-0 typo-body2_semibold text-neutral-900'>서비스를 찾을 수 없습니다.</p>
							<p className='mt-1 mb-0 typo-body3_regular text-neutral-500'>목록으로 이동합니다.</p>
						</div>
					</div>
				)}
			</div>
			{webhookConnectServiceId ? (
				<WebhookCredentialConnectModal serviceId={webhookConnectServiceId} onClose={closeWebhookConnect} />
			) : null}
		</IntegrationSettingLayout>
	)
}

export default InterSettingPage
