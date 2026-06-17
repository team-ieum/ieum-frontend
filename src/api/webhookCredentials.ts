import { api } from '@/utils/AxiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
	CreateWebhookCredentialRequest,
	CreateWebhookCredentialResponse,
	WebhookCredentialsListResponse,
} from '@/types/webhookCredentials'

export const getWebhookCredentials = async (): Promise<WebhookCredentialsListResponse> => {
	const response = await api.get<WebhookCredentialsListResponse>('/api/v1/webhook-credentials')
	return response.data
}

export const createWebhookCredential = async (body: CreateWebhookCredentialRequest): Promise<CreateWebhookCredentialResponse> => {
	const response = await api.post<CreateWebhookCredentialResponse>('/api/v1/webhook-credentials', body)
	return response.data
}

export const deleteWebhookCredential = async (id: string): Promise<ApiResponse<Record<string, never>>> => {
	const encodedId = encodeURIComponent(id)
	const response = await api.delete(`/api/v1/webhook-credentials/${encodedId}`)
	return response.data
}
