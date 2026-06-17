import IntegrationConnectedDetail from '../components/integration/IntegrationConnectedDetail'
import IntegrationListBody from '../components/integration/IntegrationListBody'
import IntegrationSettingLayout from '../components/integration/IntegrationSettingLayout'
import { INTEGRATION_PAGE_X } from '../constants/integration/layout'
import { useIntegrationSetting } from '../hooks/integration/useIntegrationSetting'
import { cn } from '../utils/cn'
import { useEffect } from 'react'
import { AiCredentialsSection } from '@/components/aiCredentials/AiCredentialsSection'
import WebhookCredentialConnectModalContainer from '@/components/integration/WebhookCredentialConnectModalContainer'
import { useDeleteWebhookCredentialMutation } from '@/hooks/webhookCredentials/mutations/useDeleteWebhookCredentialMutation'
import { useModalStore } from '@/stores/useModalStore'

const InterSettingPage = () => {
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
		isListView,
		aiCredentialsSectionRef,
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

	const { mutate: deleteWebhookCredential, isPending: isDisconnecting } = useDeleteWebhookCredentialMutation()
	const openConfirm = useModalStore(state => state.openConfirm)

	const handleDisconnect = () => {
		if (!currentService || isDisconnecting) return
		const serviceId = currentService.id
		openConfirm({
			title: '연결 해제',
			message: `${currentService.name} 연결을 해제할까요? 이 서비스를 사용하는 워크플로우가 동작하지 않을 수 있습니다.`,
			confirmText: '연결 해제',
			variant: 'danger',
			onConfirm: () => deleteWebhookCredential(serviceId, { onSuccess: goList }),
		})
	}

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
						/>
						<section
							ref={aiCredentialsSectionRef}
							id='ai-credentials'
							className='scroll-mt-[calc(var(--layout-header-height)+4.75rem)]'
							aria-label='AI 자격 증명'
						>
							<AiCredentialsSection />
						</section>
					</>
				) : currentService ? (
					<div className={cn('w-full py-6 pb-9', INTEGRATION_PAGE_X)}>
						<IntegrationConnectedDetail
							service={currentService}
							onBack={goList}
							onDisconnect={handleDisconnect}
							isDisconnecting={isDisconnecting}
						/>
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
				<WebhookCredentialConnectModalContainer serviceId={webhookConnectServiceId} onClose={closeWebhookConnect} />
			) : null}
		</IntegrationSettingLayout>
	)
}

export default InterSettingPage
