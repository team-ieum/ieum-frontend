import type { CurrentUserResponse, UpdateCurrentUserBody } from '@/types/user'
import { api } from '@/utils/AxiosInstance'

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
	const response = await api.get('/api/v1/users/me')
	return response.data
}

export const updateCurrentUser = async (body: UpdateCurrentUserBody): Promise<CurrentUserResponse> => {
	const response = await api.patch('/api/v1/users/me', body)
	return response.data
}
