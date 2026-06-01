import axios, { isAxiosError } from 'axios'
import { ApiError } from '@/utils/ApiError'
import type { ApiErrorResponse } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'

declare module 'axios' {
	interface InternalAxiosRequestConfig {
		_retry?: boolean
	}
}

export const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_URL}`,
})

api.interceptors.request.use(config => {
	const { accessToken } = useAuthStore.getState()
	if (accessToken) {
		config.headers['Authorization'] = `Bearer ${accessToken}`
	}
	return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error) reject(error)
		else resolve(token!)
	})
	failedQueue = []
}

api.interceptors.response.use(
	response => response,
	async error => {
		if (!isAxiosError(error) || error.response?.data?.success !== false) {
			return Promise.reject(error)
		}

		const { code = 'INTERNAL_SERVER_ERROR', message } = error.response.data as ApiErrorResponse
		const originalRequest = error.config!

		if (code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise<string>((resolve, reject) => {
					failedQueue.push({ resolve, reject })
				}).then(token => {
					originalRequest.headers['Authorization'] = `Bearer ${token}`
					return api(originalRequest)
				})
			}

			originalRequest._retry = true
			isRefreshing = true

			const { refreshToken, setAuth, clearAuth } = useAuthStore.getState()

			if (!refreshToken) {
				isRefreshing = false
				clearAuth()
				window.location.href = '/auth'
				return Promise.reject(new ApiError(code, message))
			}

			try {
				const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/v1/auth/refresh`, { refreshToken })
				const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data
				setAuth(newAccessToken, newRefreshToken)
				processQueue(null, newAccessToken)
				originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
				return api(originalRequest)
			} catch (refreshError) {
				processQueue(refreshError)
				clearAuth()
				window.location.href = '/auth'
				return Promise.reject(refreshError)
			} finally {
				isRefreshing = false
			}
		}

		return Promise.reject(new ApiError(code, message))
	}
)
