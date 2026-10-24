import { api } from '@/utils/AxiosInstance'
import type { ApiResponse } from '@/types/api'
import type {
	CredentialItem,
	CredentialProvider,
	CredentialType,
	ProviderInfo,
	ValidateCredentialResult,
} from '@/types/credential'

export interface RegisterCredentialBody {
	provider: CredentialProvider
	credentialType: CredentialType
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

/** @public 아직 호출하는 화면은 없지만 서버 API 연동용으로 유지한다. */
export const validateCredential = async (id: string): Promise<ApiResponse<ValidateCredentialResult>> => {
	const response = await api.post(`/api/v1/credentials/${id}/validate`)
	return response.data
}

export const deleteCredential = async (id: string): Promise<ApiResponse<Record<string, never>>> => {
	const response = await api.delete(`/api/v1/credentials/${id}`)
	return response.data
}
