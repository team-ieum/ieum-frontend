import { useMemo } from 'react'
import { AVAILABLE_INTEGRATION_CATALOG } from '@/constants/integration/availableServicesCatalog'
import { useOAuthConnectionsQuery } from '@/hooks/oauthConnections/queries/useOAuthConnectionsQuery'
import { useWebhookCredentialsQuery } from '@/hooks/webhookCredentials/queries/useWebhookCredentialsQuery'
import type { AsyncResourceState } from '@/types/asyncResource'
import type { IntegrationBrand, IntegrationService } from '@/types/integration'
import {
	getExcludedCatalogBrandsForOAuthConnections,
	mapOAuthConnectionToIntegrationService,
} from '@/utils/integration/mapOAuthConnectionToIntegrationService'
import { mapWebhookCredentialToIntegrationService } from '@/utils/integration/mapWebhookCredentialToIntegrationService'

type UseIntegrationServicesViewModelResult = {
	connected: IntegrationService[]
	available: IntegrationService[]
	connectedCount: number
	availableCount: number
	canResolveAvailable: boolean
	canNormalizeDetail: boolean
	hasDetailResolutionError: boolean
	webhookResource: AsyncResourceState
	oauthResource: AsyncResourceState
}

const filterCatalogAvailable = (catalog: IntegrationService[], excludedBrands: Set<IntegrationBrand>) =>
	catalog.filter(service => !excludedBrands.has(service.brand))

export const useIntegrationServicesViewModel = (): UseIntegrationServicesViewModelResult => {
	const webhookQuery = useWebhookCredentialsQuery()
	const oauthQuery = useOAuthConnectionsQuery()

	const webhookConnected = useMemo(
		() => (webhookQuery.data ?? []).map(mapWebhookCredentialToIntegrationService),
		[webhookQuery.data]
	)
	const oauthConnected = useMemo(() => (oauthQuery.data ?? []).map(mapOAuthConnectionToIntegrationService), [oauthQuery.data])
	const connected = useMemo(() => [...webhookConnected, ...oauthConnected], [webhookConnected, oauthConnected])
	const canResolveAvailable = webhookQuery.data !== undefined && oauthQuery.data !== undefined
	const excludedCatalogBrands = useMemo(() => {
		const brands = new Set(webhookConnected.map(service => service.brand))
		getExcludedCatalogBrandsForOAuthConnections(oauthQuery.data ?? []).forEach(brand => brands.add(brand))
		return brands
	}, [oauthQuery.data, webhookConnected])
	const available = useMemo(
		() => (canResolveAvailable ? filterCatalogAvailable(AVAILABLE_INTEGRATION_CATALOG, excludedCatalogBrands) : []),
		[canResolveAvailable, excludedCatalogBrands]
	)
	return {
		connected,
		available,
		connectedCount: connected.length,
		availableCount: available.length,
		canResolveAvailable,
		canNormalizeDetail:
			webhookQuery.isSuccess && oauthQuery.isSuccess && !webhookQuery.isRefetching && !oauthQuery.isRefetching,
		hasDetailResolutionError:
			webhookQuery.isLoadingError || oauthQuery.isLoadingError || webhookQuery.isRefetchError || oauthQuery.isRefetchError,
		webhookResource: {
			isLoading: webhookQuery.isLoading,
			isRefetching: webhookQuery.isRefetching,
			isLoadingError: webhookQuery.isLoadingError,
			isRefetchError: webhookQuery.isRefetchError,
			retry: () => void webhookQuery.refetch(),
		},
		oauthResource: {
			isLoading: oauthQuery.isLoading,
			isRefetching: oauthQuery.isRefetching,
			isLoadingError: oauthQuery.isLoadingError,
			isRefetchError: oauthQuery.isRefetchError,
			retry: () => void oauthQuery.refetch(),
		},
	}
}
