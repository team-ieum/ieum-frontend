export interface ApiResponse<T> {
	success: boolean
	data: T
	message: string
	code: string
}

export type ApiErrorCode =
	| 'INVALID_INPUT'
	| 'NOT_FOUND'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_SUPPORTED'
	| 'INTERNAL_SERVER_ERROR'

export interface ApiErrorResponse {
	success: false
	message: string
	code: ApiErrorCode
}
