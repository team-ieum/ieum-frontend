import { api } from '@/utils/AxiosInstance'
import type { GoogleMyScopesResponse, GoogleScopesResponse } from '@/types/googleOAuth'

export const getGoogleScopes = async (): Promise<GoogleScopesResponse> => {
	const response = await api.get<GoogleScopesResponse>('/api/v1/oauth/google/scopes')
	return response.data
}

export const getGoogleMyScopes = async (): Promise<GoogleMyScopesResponse> => {
	const response = await api.get<GoogleMyScopesResponse>('/api/v1/oauth/google/my-scopes')
	return response.data
}
