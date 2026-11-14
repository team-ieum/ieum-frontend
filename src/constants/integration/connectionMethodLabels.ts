import type { IntegrationConnectionMethod } from '@/types/integration'

export const INTEGRATION_CONNECTION_METHOD_LABEL: Record<IntegrationConnectionMethod, string> = {
	bot: '봇',
	webhook: '웹훅',
}
