import axios, { isAxiosError } from 'axios'
import { ApiError } from '@/utils/ApiError'
import type { ApiErrorResponse } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { refreshAccessToken } from '@/services/authRefresh'

declare module 'axios' {
	interface InternalAxiosRequestConfig {
		_retry?: boolean
		_authRetryToken?: string
	}
}

export const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_URL}`,
})

api.interceptors.request.use(config => {
	const { accessToken } = useAuthStore.getState()
	if (config._authRetryToken && config._authRetryToken !== accessToken) {
		return Promise.reject(new DOMException('인증 상태가 변경되어 재요청을 취소했어요.', 'AbortError'))
	}
	if (accessToken) {
		config.headers['Authorization'] = `Bearer ${accessToken}`
	}
	return config
})

const isFailedApiResponse = (data: unknown): data is ApiErrorResponse =>
	typeof data === 'object' && data !== null && (data as { success?: unknown }).success === false

api.interceptors.response.use(
	response => {
		if (isFailedApiResponse(response.data)) {
			const { code = 'INTERNAL_SERVER_ERROR', message } = response.data
			return Promise.reject(new ApiError(code, message ?? '요청을 처리하지 못했어요.'))
		}
		return response
	},
	async error => {
		if (!isAxiosError(error) || error.response?.data?.success !== false) {
			return Promise.reject(error)
		}

		const { code = 'INTERNAL_SERVER_ERROR', message } = error.response.data as ApiErrorResponse
		const originalRequest = error.config!

		if (code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
			originalRequest._retry = true
			const failedToken = originalRequest.headers['Authorization']?.toString().replace(/^Bearer /, '') ?? ''
			try {
				const token = await refreshAccessToken(failedToken, originalRequest.signal as AbortSignal | undefined)
				originalRequest._authRetryToken = token
				originalRequest.headers['Authorization'] = `Bearer ${token}`
				return api(originalRequest)
			} catch (refreshError) {
				// A late failure must not log out a different/newly logged-in session.
				if (
					!(refreshError instanceof Error && refreshError.name === 'AbortError') &&
					useAuthStore.getState().accessToken === failedToken
				) {
					useAuthStore.getState().clearAuth()
					window.location.href = '/auth'
				}
				return Promise.reject(refreshError)
			}
		}

		return Promise.reject(new ApiError(code, message))
	}
)
