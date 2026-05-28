import type { IntegrationConnectedDisplayStatus, IntegrationService, IntegrationStatus } from '../../types/integration'

export const isAvailableService = (service: IntegrationService) => service.status === 'available'

export const isConnectedService = (service: IntegrationService) => !isAvailableService(service)

export const partitionServices = (services: IntegrationService[]) => ({
	connected: services.filter(isConnectedService),
	available: services.filter(isAvailableService),
})

export const findServiceById = (services: IntegrationService[], id: string) => services.find(service => service.id === id)

export const toConnectedDisplayStatus = (status: IntegrationStatus): IntegrationConnectedDisplayStatus =>
	status === 'available' ? 'connected' : status
