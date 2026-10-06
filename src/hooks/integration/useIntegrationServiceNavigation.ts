import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import type { IntegrationDetailResolution, IntegrationService, IntegrationView } from '@/types/integration'
import { isOAuthReturnSearchParams } from '@/utils/integration/integrationOAuthReturn'
import {
	hasIntegrationServiceIdParam,
	isCanonicalIntegrationViewParams,
	parseIntegrationView,
	serializeIntegrationView,
} from '@/utils/integration/integrationViewParams'
import { findServiceById } from '@/utils/integration/selectors'

type UseIntegrationServiceNavigationOptions = {
	connected: IntegrationService[]
	canNormalizeDetail: boolean
	hasDetailResolutionError: boolean
}

type UseIntegrationServiceNavigationResult = {
	view: IntegrationView
	detailResolution: IntegrationDetailResolution
	currentService: IntegrationService | undefined
	isListView: boolean
	hasServiceIdParam: boolean
	goDetail: (id: string) => void
	goList: () => void
}

export const useIntegrationServiceNavigation = ({
	connected,
	canNormalizeDetail,
	hasDetailResolutionError,
}: UseIntegrationServiceNavigationOptions): UseIntegrationServiceNavigationResult => {
	const [searchParams, setSearchParams] = useSearchParams()
	const parsedView = parseIntegrationView(searchParams)
	const parsedService = parsedView.kind === 'detail' ? findServiceById(connected, parsedView.id) : undefined
	const shouldNormalizeDetail =
		canNormalizeDetail &&
		!isOAuthReturnSearchParams(searchParams) &&
		(!isCanonicalIntegrationViewParams(searchParams) || (parsedView.kind === 'detail' && !parsedService))
	const view: IntegrationView = shouldNormalizeDetail ? { kind: 'list' } : parsedView
	const currentService = view.kind === 'detail' ? parsedService : undefined
	const detailResolution: IntegrationDetailResolution =
		view.kind === 'list' ? 'list' : currentService ? 'ready' : hasDetailResolutionError ? 'error' : 'loading'

	useEffect(() => {
		if (!shouldNormalizeDetail) return
		setSearchParams(current => serializeIntegrationView(current, { kind: 'list' }), { replace: true })
	}, [setSearchParams, shouldNormalizeDetail])

	const goDetail = useCallback(
		(id: string) => {
			setSearchParams(current => serializeIntegrationView(current, { kind: 'detail', id }))
		},
		[setSearchParams]
	)

	const goList = useCallback(() => {
		setSearchParams(current => serializeIntegrationView(current, { kind: 'list' }), { replace: true })
	}, [setSearchParams])

	return {
		view,
		detailResolution,
		currentService,
		isListView: view.kind === 'list',
		hasServiceIdParam: hasIntegrationServiceIdParam(searchParams),
		goDetail,
		goList,
	}
}
