import type { ApiResponse } from '@/types/api'
import type { ChangePasswordBody, CurrentUserResponse, UpdateCurrentUserBody } from '@/types/user'
import { api } from '@/utils/AxiosInstance'

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
	const response = await api.get('/api/v1/users/me')
	return response.data
}

export const updateCurrentUser = async (body: UpdateCurrentUserBody): Promise<CurrentUserResponse> => {
	const response = await api.patch('/api/v1/users/me', body)
	return response.data
}

/** 성공하면 서버가 모든 기기의 Refresh Token을 지우므로 호출한 쪽에서 다시 로그인하게 한다. */
export const changePassword = async (body: ChangePasswordBody): Promise<ApiResponse<Record<string, never>>> => {
	const response = await api.patch('/api/v1/users/me/password', body)
	return response.data
}

/** 계정과 모든 사용자 데이터를 즉시 영구 삭제한다. 성공하면 호출한 쪽에서 토큰을 버리고 로그인 화면으로 보낸다. */
export const deleteCurrentUser = async (): Promise<ApiResponse<Record<string, never>>> => {
	const response = await api.delete('/api/v1/users/me')
	return response.data
}
