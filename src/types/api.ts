export interface ApiResponse<T> {
	success: boolean
	data: T
	message: string
	code: string
}

import type { AuthErrorCode } from '@/types/auth'
import type { CredentialErrorCode } from '@/types/credential'
import type { WorkflowErrorCode } from '@/types/workflowList'

export type CommonErrorCode =
	| 'INVALID_INPUT'
	| 'NOT_FOUND'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_SUPPORTED'
	| 'INTERNAL_SERVER_ERROR'

export type ApiErrorCode = CommonErrorCode | AuthErrorCode | WorkflowErrorCode | CredentialErrorCode

export interface ApiErrorResponse {
	success: false
	data: null
	message: string
	code?: ApiErrorCode
}
