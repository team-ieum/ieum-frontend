import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { isApiError } from '@/utils/ApiError'

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

const isWorkflowValidationErrorDto = (value: unknown): value is WorkflowValidationErrorDto => {
	if (typeof value !== 'object' || value === null) return false
	const record = value as Record<string, unknown>
	return (
		isNullableString(record.nodeId) &&
		isNullableString(record.field) &&
		typeof record.code === 'string' &&
		typeof record.message === 'string'
	)
}

/**
 * 수동 실행이 400 `WORKFLOW_VALIDATION_FAILED`로 거부된 오류에서 서버 문구와 검사 오류 목록을 꺼낸다.
 * 다른 오류거나 `data.errors`가 배열이 아니면 null이다. 모양이 맞지 않는 원소는 버린다.
 */
export const getWorkflowValidationFailure = (
	error: unknown
): { message: string; errors: WorkflowValidationErrorDto[] } | null => {
	if (!isApiError(error) || error.code !== 'WORKFLOW_VALIDATION_FAILED') return null
	const { data } = error
	if (typeof data !== 'object' || data === null || !('errors' in data) || !Array.isArray(data.errors)) return null
	return { message: error.message, errors: data.errors.filter(isWorkflowValidationErrorDto) }
}
