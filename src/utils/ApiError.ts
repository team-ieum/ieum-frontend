import type { ApiErrorCode } from '@/types/api'

interface ApiErrorDetails {
	data?: unknown
	status?: number
}

/**
 * 서버가 `success: false`로 응답한 API 오류.
 *
 * `data`는 오류 응답 본문의 `data`를 그대로 담으므로 사용처에서 형태를 검사한 뒤 사용한다.
 * `status`는 HTTP 2xx로 온 실패 응답이면 2xx 값이 되어, 실패 여부가 아니라 HTTP 상태 구분에만 쓴다.
 */
export class ApiError extends Error {
	readonly code: ApiErrorCode
	readonly data: unknown
	readonly status?: number

	constructor(code: ApiErrorCode, message: string, { data = null, status }: ApiErrorDetails = {}) {
		super(message)
		this.name = 'ApiError'
		this.code = code
		this.data = data
		this.status = status
	}
}

export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError
}
