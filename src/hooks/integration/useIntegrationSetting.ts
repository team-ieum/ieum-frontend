import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { WebhookConnectServiceId } from '@/constants/integration/webhookCredentialConnect'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { IntegrationDetailResolution, IntegrationService, IntegrationTabId, IntegrationView } from '@/types/integration'
import { getOAuthReconnectServiceId } from '@/utils/integration/getOAuthReconnectServiceId'
import { useIntegrationConnect } from './useIntegrationConnect'
import { useIntegrationDisconnect } from './useIntegrationDisconnect'
import { useIntegrationOAuthReturn } from './useIntegrationOAuthReturn'
import { useIntegrationSectionNavigation } from './useIntegrationSectionNavigation'
import { useIntegrationServiceNavigation } from './useIntegrationServiceNavigation'
import { useIntegrationServicesViewModel } from './useIntegrationServicesViewModel'

type UseIntegrationSettingResult = {
	view: IntegrationView
	detailResolution: IntegrationDetailResolution
	activeTab: IntegrationTabId
	connected: IntegrationService[]
	available: IntegrationService[]
	currentService: IntegrationService | undefined
	connectedCount: number
	availableCount: number
	canResolveAvailable: boolean
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
	isListView: boolean
	aiCredentialsSectionRef: RefObject<HTMLElement | null>
	goDetail: (id: string) => void
	goList: () => void
	handleTabChange: (tab: IntegrationTabId) => void
	onConnect: (id: string) => void
	onDisconnect: () => void
	isDisconnecting: boolean
	/** Google처럼 해제 확인 전에 영향받는 워크플로우를 조회하는 중인지 */
	isCheckingDisconnect: boolean
	canDisconnect: boolean
	/** 상세의 OAuth 연결을 같은 공급자 인가 화면으로 다시 보낸다. `canReconnect`가 false면 아무것도 하지 않는다. */
	onReconnect: () => void
	canReconnect: boolean
	/** 다시 연결 인가 URL을 받는 중이거나 그 URL로 이동하는 중인지 */
	isReconnecting: boolean
	webhookConnectServiceId: WebhookConnectServiceId | null
	closeWebhookConnect: () => void
}

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	useIntegrationOAuthReturn()

	const { connect, connectingId, webhookConnectServiceId, closeWebhookConnect } = useIntegrationConnect()
	const services = useIntegrationServicesViewModel()
	const navigation = useIntegrationServiceNavigation({
		connected: services.connected,
		canNormalizeDetail: services.canNormalizeDetail,
		hasDetailResolutionError: services.hasDetailResolutionError,
	})
	const sections = useIntegrationSectionNavigation({
		isListView: navigation.isListView,
		shouldReturnToList: navigation.hasServiceIdParam,
		onReturnToList: navigation.goList,
	})
	const { disconnect, isDisconnecting, isCheckingAffectedWorkflows, canDisconnect } = useIntegrationDisconnect({
		service: navigation.currentService,
		onDisconnected: navigation.goList,
	})

	const onConnect = useCallback(
		(id: string) => {
			void connect(id)
		},
		[connect]
	)

	const reconnectServiceId = getOAuthReconnectServiceId(navigation.currentService)
	const isReconnecting = reconnectServiceId !== null && connectingId === reconnectServiceId
	const onReconnect = useCallback(() => {
		if (!reconnectServiceId || isReconnecting) return
		void connect(reconnectServiceId)
	}, [connect, isReconnecting, reconnectServiceId])

	return {
		view: navigation.view,
		detailResolution: navigation.detailResolution,
		activeTab: sections.activeSection,
		connected: services.connected,
		available: services.available,
		currentService: navigation.currentService,
		connectedCount: services.connectedCount,
		availableCount: services.availableCount,
		canResolveAvailable: services.canResolveAvailable,
		webhookResource: services.webhookResource,
		oauthResource: services.oauthResource,
		isListView: navigation.isListView,
		aiCredentialsSectionRef: sections.aiCredentialsSectionRef,
		goDetail: navigation.goDetail,
		goList: navigation.goList,
		handleTabChange: sections.handleSectionChange,
		onConnect,
		onDisconnect: disconnect,
		isDisconnecting,
		isCheckingDisconnect: isCheckingAffectedWorkflows,
		canDisconnect,
		onReconnect,
		canReconnect: reconnectServiceId !== null,
		isReconnecting,
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
