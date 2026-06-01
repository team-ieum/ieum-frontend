import axios, { isAxiosError } from 'axios'
import { ApiError } from './ApiError'
import type { ApiErrorResponse } from '../types/api'

export const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_URL}`,
})

api.interceptors.response.use(
	response => response,
	error => {
		if (isAxiosError(error) && error.response?.data?.code) {
			const { code, message } = error.response.data as ApiErrorResponse
			return Promise.reject(new ApiError(code, message))
		}
		return Promise.reject(error)
	}
)
