import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AVAILABLE_INTEGRATION_CATALOG } from '@/constants/integration/availableServicesCatalog'
import { useOAuthConnectionsQuery } from '@/hooks/oauthConnections/queries/useOAuthConnectionsQuery'
import { useWebhookCredentialsQuery } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import type {
	IntegrationBrand,
	IntegrationService,
	IntegrationTabId,
	IntegrationView,
	UseIntegrationSettingResult,
} from '../../types/integration'
import {
	getExcludedCatalogBrandsForOAuthConnections,
	mapOAuthConnectionToIntegrationService,
} from '../../utils/integration/mapOAuthConnectionToIntegrationService'
import { mapWebhookCredentialToIntegrationService } from '../../utils/integration/mapWebhookCredentialToIntegrationService'
import { findServiceById } from '../../utils/integration/selectors'
import { useIntegrationConnect } from './useIntegrationConnect'

const filterCatalogAvailable = (catalog: IntegrationService[], excludedBrands: Set<IntegrationBrand>) =>
	catalog.filter(service => !excludedBrands.has(service.brand))

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')

	const { connect, webhookConnectServiceId, closeWebhookConnect } = useIntegrationConnect()

	const { data: webhookCredentials = [], isLoading: isWebhookLoading, isError: isWebhookError } = useWebhookCredentialsQuery()

	const {
		data: oauthConnections = [],
		isLoading: isOAuthConnectionsLoading,
		isError: isOAuthConnectionsError,
	} = useOAuthConnectionsQuery()

	const availableSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAvailableRef = useRef(false)

	const webhookConnected = useMemo(() => webhookCredentials.map(mapWebhookCredentialToIntegrationService), [webhookCredentials])

	const oauthConnected = useMemo(() => oauthConnections.map(mapOAuthConnectionToIntegrationService), [oauthConnections])

	const connected = useMemo(() => [...webhookConnected, ...oauthConnected], [webhookConnected, oauthConnected])

	const excludedCatalogBrands = useMemo(() => {
		const brands = new Set(webhookConnected.map(service => service.brand))
		getExcludedCatalogBrandsForOAuthConnections(oauthConnections).forEach(brand => brands.add(brand))
		return brands
	}, [webhookConnected, oauthConnections])

	const available = useMemo(
		() => filterCatalogAvailable(AVAILABLE_INTEGRATION_CATALOG, excludedCatalogBrands),
		[excludedCatalogBrands]
	)

	const services = useMemo(() => [...connected, ...available], [connected, available])

	const currentService = view.kind === 'detail' ? findServiceById(services, view.id) : undefined

	const goDetail = useCallback((id: string) => {
		setView({ kind: 'detail', id })
	}, [])

	const goList = useCallback(() => {
		setView({ kind: 'list' })
	}, [])

	const handleTabChange = useCallback((tab: IntegrationTabId) => {
		if (tab === 'available') {
			shouldScrollToAvailableRef.current = true
			setView(prev => (prev.kind === 'detail' ? { kind: 'list' } : prev))
		}
		setActiveTab(tab)
	}, [])

	useEffect(() => {
		if (!shouldScrollToAvailableRef.current || activeTab !== 'available' || view.kind !== 'list') {
			return
		}

		shouldScrollToAvailableRef.current = false
		requestAnimationFrame(() => {
			availableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}, [activeTab, view.kind])

	const onConnect = useCallback(
		(id: string) => {
			void connect(id)
		},
		[connect]
	)

	const isConnectedLoading = isWebhookLoading || isOAuthConnectionsLoading
	const isConnectedError = isWebhookError || isOAuthConnectionsError

	return {
		view,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount: connected.length,
		availableCount: available.length,
		isConnectedLoading,
		isConnectedError,
		isAvailableLoading: false,
		isAvailableError: false,
		isListView: view.kind === 'list',
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
		onConnect,
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
