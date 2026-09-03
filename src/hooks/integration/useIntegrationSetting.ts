import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { IntegrationDetailResolution, IntegrationService, IntegrationTabId, IntegrationView } from '@/types/integration'
import { useIntegrationConnect } from './useIntegrationConnect'
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
	webhookConnectServiceId: 'slack' | 'discord' | null
	closeWebhookConnect: () => void
}

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	useIntegrationOAuthReturn()

	const { connect, webhookConnectServiceId, closeWebhookConnect } = useIntegrationConnect()
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

	const onConnect = useCallback(
		(id: string) => {
			void connect(id)
		},
		[connect]
	)

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
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
