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
import { useIntegrationOAuthReturn } from './useIntegrationOAuthReturn'

const filterCatalogAvailable = (catalog: IntegrationService[], excludedBrands: Set<IntegrationBrand>) =>
	catalog.filter(service => !excludedBrands.has(service.brand))

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	useIntegrationOAuthReturn()

	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('services')

	const { connect, webhookConnectServiceId, closeWebhookConnect } = useIntegrationConnect()

	const { data: webhookCredentials = [], isLoading: isWebhookLoading, isError: isWebhookError } = useWebhookCredentialsQuery()

	const {
		data: oauthConnections = [],
		isLoading: isOAuthConnectionsLoading,
		isError: isOAuthConnectionsError,
	} = useOAuthConnectionsQuery()

	const aiCredentialsSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAiCredentialsRef = useRef(false)
	const isAutoScrollingRef = useRef(false)
	const autoScrollIdleTimerRef = useRef<number | undefined>(undefined)

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
		setView(prev => (prev.kind === 'detail' ? { kind: 'list' } : prev))
		isAutoScrollingRef.current = true
		if (tab === 'aiCredentials') {
			shouldScrollToAiCredentialsRef.current = true
		} else {
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
		setActiveTab(tab)
	}, [])

	useEffect(() => {
		if (!shouldScrollToAiCredentialsRef.current || activeTab !== 'aiCredentials' || view.kind !== 'list') {
			return
		}

		shouldScrollToAiCredentialsRef.current = false
		requestAnimationFrame(() => {
			aiCredentialsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}, [activeTab, view.kind])

	// 수동 스크롤 시 화면에 보이는 섹션에 맞춰 활성 탭 동기화 (스크롤 스파이)
	useEffect(() => {
		if (view.kind !== 'list') return

		const handleScroll = () => {
			// 탭 클릭으로 인한 자동 스크롤 중에는 탭 상태를 건드리지 않고,
			// 스크롤이 멈춘 뒤(200ms)부터 스파이를 다시 활성화한다.
			if (isAutoScrollingRef.current) {
				window.clearTimeout(autoScrollIdleTimerRef.current)
				autoScrollIdleTimerRef.current = window.setTimeout(() => {
					isAutoScrollingRef.current = false
				}, 200)
				return
			}

			const section = aiCredentialsSectionRef.current
			if (!section) return

			const isAiCredentialsInView = section.getBoundingClientRect().top <= window.innerHeight / 3
			setActiveTab(isAiCredentialsInView ? 'aiCredentials' : 'services')
		}

		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', handleScroll)
			window.clearTimeout(autoScrollIdleTimerRef.current)
		}
	}, [view.kind])

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
		isListView: view.kind === 'list',
		aiCredentialsSectionRef,
		goDetail,
		goList,
		handleTabChange,
		onConnect,
		webhookConnectServiceId,
		closeWebhookConnect,
	}
}
