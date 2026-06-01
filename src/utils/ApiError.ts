import type { ApiErrorCode } from '@/types/api'

export class ApiError extends Error {
	readonly code: ApiErrorCode

	constructor(code: ApiErrorCode, message: string) {
		super(message)
		this.name = 'ApiError'
		this.code = code
	}
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError
}
