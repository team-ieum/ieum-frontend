import type { IntegrationConnectedDisplayStatus, IntegrationService, IntegrationStatus } from '@/types/integration'

export const findServiceById = (services: IntegrationService[], id: string) => services.find(service => service.id === id)

export const toConnectedDisplayStatus = (status: IntegrationStatus): IntegrationConnectedDisplayStatus =>
	status === 'available' ? 'connected' : status
