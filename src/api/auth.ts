import { api } from '../utils/AxiosInstance'
import type { RequestRegisterDto, RegisterResponse } from '../types/auth'

export const login = async (email: string, password: string) => {
	const response = await api.post('/auth/login', { email, password })
	return response.data
}

export const register = async (data: RequestRegisterDto): Promise<RegisterResponse> => {
	const response = await api.post('/api/v1/auth/register', data)
	return response.data
}
