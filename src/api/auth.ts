import axios, { isAxiosError } from 'axios'
import { ApiError } from '@/utils/ApiError'
import type { ApiErrorResponse } from '@/types/api'
import type { AuthActionResponse, SendEmailCodeRequest, VerifyEmailCodeRequest, ResetPasswordRequest } from '@/types/auth'
import { api } from '@/utils/AxiosInstance'
import type { RequestRegisterDto, RegisterResponse, LoginResponse } from '@/types/auth'

export const login = async (email: string, password: string): Promise<LoginResponse> => {
	const response = await api.post('/api/v1/auth/login', { email, password })
	return response.data
}

export const register = (data: RequestRegisterDto): Promise<RegisterResponse> =>
	postPublicAuth<RegisterResponse>('/api/v1/auth/register', { ...data, email: data.email.trim().toLowerCase() })

// 인증 요청은 기존 세션의 인증 헤더나 토큰 갱신 처리를 사용하지 않는다.
const publicAuthApi = axios.create({ baseURL: import.meta.env.VITE_API_URL })

const postPublicAuth = async <T extends AuthActionResponse>(path: string, body: unknown): Promise<T> => {
	try {
		const response = await publicAuthApi.post<T>(path, body)
		if (!response.data.success) {
			const failure = response.data as unknown as ApiErrorResponse
			throw new ApiError(failure.code ?? 'INTERNAL_SERVER_ERROR', failure.message)
		}
		return response.data
	} catch (error) {
		if (isAxiosError<ApiErrorResponse>(error) && error.response?.data?.success === false) {
			throw new ApiError(error.response.data.code ?? 'INTERNAL_SERVER_ERROR', error.response.data.message)
		}
		throw error
	}
}

export const sendEmailCode = (body: SendEmailCodeRequest) =>
	postPublicAuth<AuthActionResponse>('/api/v1/auth/email/send-code', { ...body, email: body.email.trim().toLowerCase() })

export const verifyEmailCode = (body: VerifyEmailCodeRequest) =>
	postPublicAuth<AuthActionResponse>('/api/v1/auth/email/verify-code', { ...body, email: body.email.trim().toLowerCase() })

export const resetPassword = (body: ResetPasswordRequest) =>
	postPublicAuth<AuthActionResponse>('/api/v1/auth/password/reset', { ...body, email: body.email.trim().toLowerCase() })
