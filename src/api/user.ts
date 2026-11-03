import type { CurrentUserResponse } from '@/types/user'
import { api } from '@/utils/AxiosInstance'

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
	const response = await api.get('/api/v1/users/me')
	return response.data
}
