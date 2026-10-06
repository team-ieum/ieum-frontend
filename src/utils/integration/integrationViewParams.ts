import type { IntegrationView } from '@/types/integration'

const SERVICE_ID_PARAM = 'serviceId'

export const parseIntegrationView = (searchParams: URLSearchParams): IntegrationView => {
	const serviceIds = searchParams.getAll(SERVICE_ID_PARAM)
	return serviceIds.length === 1 && serviceIds[0] ? { kind: 'detail', id: serviceIds[0] } : { kind: 'list' }
}

export const serializeIntegrationView = (searchParams: URLSearchParams, view: IntegrationView): URLSearchParams => {
	const nextSearchParams = new URLSearchParams(searchParams)
	nextSearchParams.delete(SERVICE_ID_PARAM)
	if (view.kind === 'detail') nextSearchParams.set(SERVICE_ID_PARAM, view.id)
	return nextSearchParams
}

export const hasIntegrationServiceIdParam = (searchParams: URLSearchParams): boolean => searchParams.has(SERVICE_ID_PARAM)

export const isCanonicalIntegrationViewParams = (searchParams: URLSearchParams): boolean => {
	const serviceIds = searchParams.getAll(SERVICE_ID_PARAM)
	return serviceIds.length === 0 || (serviceIds.length === 1 && serviceIds[0].length > 0)
}
