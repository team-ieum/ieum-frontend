import { api } from '@/utils/AxiosInstance'
import type { ApiResponse } from '@/types/api'
import type { CredentialItem, ProviderInfo, ValidateCredentialResult } from '@/types/credential'

export interface RegisterCredentialBody {
	provider: string
	credentialType: string
	displayName: string
	apiKey: string
}

export const getProviders = async (): Promise<ApiResponse<{ providers: ProviderInfo[] }>> => {
	const response = await api.get('/api/v1/providers')
	return response.data
}

export const getCredentials = async (): Promise<ApiResponse<CredentialItem[]>> => {
	const response = await api.get('/api/v1/credentials')
	return response.data
}

export const registerCredential = async (body: RegisterCredentialBody): Promise<ApiResponse<CredentialItem>> => {
	const response = await api.post('/api/v1/credentials', body)
	return response.data
}

export const validateCredential = async (id: string): Promise<ApiResponse<ValidateCredentialResult>> => {
	const response = await api.post(`/api/v1/credentials/${id}/validate`)
	return response.data
}

export const deleteCredential = async (id: string): Promise<ApiResponse<Record<string, never>>> => {
	const response = await api.delete(`/api/v1/credentials/${id}`)
	return response.data
}
