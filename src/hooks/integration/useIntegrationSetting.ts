import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AVAILABLE_INTEGRATION_CATALOG } from '@/constants/integration/availableServicesCatalog'
import { GOOGLE_SCOPE_BRANDS } from '@/constants/integration/googleScopeGroups'
import { useGoogleMyScopesQuery } from '@/hooks/googleOAuth/queries/useGoogleMyScopesQuery'
import { useGoogleScopesQuery } from '@/hooks/googleOAuth/queries/useGoogleScopesQuery'
import { useWebhookCredentialsQuery } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import type { IntegrationService, IntegrationTabId, IntegrationView, UseIntegrationSettingResult } from '../../types/integration'
import {
	mapGoogleMyScopesToConnectedService,
	mapGoogleScopesToAvailableServices,
} from '../../utils/integration/mapGoogleOAuthToIntegrationService'
import { mapWebhookCredentialToIntegrationService } from '../../utils/integration/mapWebhookCredentialToIntegrationService'
import { findServiceById } from '../../utils/integration/selectors'
import { useIntegrationConnect } from './useIntegrationConnect'

const filterCatalogAvailable = (
	catalog: IntegrationService[],
	webhookConnected: IntegrationService[],
	googleConnected: boolean
) => {
	const connectedBrands = new Set(webhookConnected.map(service => service.brand))

	return catalog.filter(service => {
		if (connectedBrands.has(service.brand)) return false
		if (googleConnected && GOOGLE_SCOPE_BRANDS.includes(service.brand)) return false
		return true
	})
}

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')

	const { connect } = useIntegrationConnect()

	const { data: webhookCredentials = [], isLoading: isWebhookLoading, isError: isWebhookError } = useWebhookCredentialsQuery()

	const { data: googleScopesData, isLoading: isGoogleScopesLoading, isError: isGoogleScopesError } = useGoogleScopesQuery()

	const {
		data: googleMyScopesData,
		isLoading: isGoogleMyScopesLoading,
		isError: isGoogleMyScopesError,
	} = useGoogleMyScopesQuery()

	const availableSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAvailableRef = useRef(false)

	const webhookConnected = useMemo(() => webhookCredentials.map(mapWebhookCredentialToIntegrationService), [webhookCredentials])

	const googleConnectedService = useMemo(
		() => (googleMyScopesData ? mapGoogleMyScopesToConnectedService(googleMyScopesData) : null),
		[googleMyScopesData]
	)

	const googleConnected = Boolean(googleConnectedService)

	const connected = useMemo(() => {
		const items = [...webhookConnected]
		if (googleConnectedService) items.push(googleConnectedService)
		return items
	}, [webhookConnected, googleConnectedService])

	const googleAvailable = useMemo(() => {
		if (googleConnected || !googleScopesData) return []
		return mapGoogleScopesToAvailableServices(googleScopesData)
	}, [googleConnected, googleScopesData])

	const available = useMemo(() => {
		const filteredCatalog = filterCatalogAvailable(AVAILABLE_INTEGRATION_CATALOG, webhookConnected, googleConnected)
		const googleBrands = new Set(googleAvailable.map(service => service.brand))
		const catalogWithoutGoogleDupes = filteredCatalog.filter(service => !googleBrands.has(service.brand))
		return [...catalogWithoutGoogleDupes, ...googleAvailable]
	}, [webhookConnected, googleConnected, googleAvailable])

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

	const isConnectedLoading = isWebhookLoading || isGoogleMyScopesLoading
	const isConnectedError = isWebhookError || isGoogleMyScopesError
	const isAvailableLoading = isGoogleScopesLoading
	const isAvailableError = isGoogleScopesError

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
		isAvailableLoading,
		isAvailableError,
		isListView: view.kind === 'list',
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
		onConnect,
	}
}
