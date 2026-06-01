import { api } from '@/utils/AxiosInstance'
import type { WebhookCredentialsListResponse } from '@/types/webhookCredentials'

export const getWebhookCredentials = async (): Promise<WebhookCredentialsListResponse> => {
	const response = await api.get<WebhookCredentialsListResponse>('/api/v1/webhook-credentials')
	return response.data
}
