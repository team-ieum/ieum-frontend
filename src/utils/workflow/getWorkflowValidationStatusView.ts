import type { ApiErrorCode } from '@/types/api'
import type { WorkflowValidationStatusView } from '@/types/workflowValidation'
import { isApiError } from '@/utils/ApiError'

const UNAVAILABLE_LABEL = '지금은 검사할 수 없어요'
const SAVED_VERSION_DETAIL = '저장된 버전 기준'

type WorkflowValidationStatusInput = {
	/** 검사 결과를 한 번이라도 받았는지(실행 400으로 받은 결과 포함). */
	hasResult: boolean
	errorCount: number
	isFetching: boolean
	/** 마지막 검사 요청이 실패했으면 그 오류. 성공했으면 null. */
	fetchError: unknown
	hasUnsavedChanges: boolean
	/** 수동 실행 400의 서버 문구. 다음 검사 결과가 오기 전까지만 넘긴다. */
	executionFailureMessage: string | null
}

// FE-60 명세가 validate의 그 밖의 오류로 정한 두 코드(400 INVALID_WORKFLOW, 404 WORKFLOW_NOT_FOUND)는 워크플로우 자체의
// 상태를 알리므로 서버 문구를 보여 주고 다시 검사 버튼을 두지 않는다. 나머지 오류는 모두 다시 검사할 수 있게 둔다.
const NON_RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>(['INVALID_WORKFLOW', 'WORKFLOW_NOT_FOUND'])

const getNonRetryableError = (error: unknown) => (isApiError(error) && NON_RETRYABLE_CODES.has(error.code) ? error : null)

/**
 * 툴바 검사 상태 칩에 그릴 라벨과 색을 정한다. 보여 줄 상태가 없으면 null이다.
 * 실패한 검사는 이전 결과를 지우지 않으므로, 이전 결과에 문제가 있으면 보조 문구로 함께 알린다.
 */
export const getWorkflowValidationStatusView = ({
	hasResult,
	errorCount,
	isFetching,
	fetchError,
	hasUnsavedChanges,
	executionFailureMessage,
}: WorkflowValidationStatusInput): WorkflowValidationStatusView | null => {
	const savedVersionDetail = hasResult && hasUnsavedChanges ? SAVED_VERSION_DETAIL : undefined

	if (isFetching) return { tone: 'neutral', label: '검사 중…', isChecking: true, canRetry: false }

	if (fetchError) {
		const nonRetryableError = getNonRetryableError(fetchError)
		return {
			tone: 'warning',
			label: nonRetryableError ? nonRetryableError.message : UNAVAILABLE_LABEL,
			detail: hasResult && errorCount > 0 ? `이전 결과 문제 ${errorCount}건` : undefined,
			isChecking: false,
			canRetry: !nonRetryableError,
		}
	}

	if (executionFailureMessage) {
		return { tone: 'danger', label: executionFailureMessage, detail: savedVersionDetail, isChecking: false, canRetry: true }
	}

	if (!hasResult) return null

	if (errorCount > 0) {
		return { tone: 'danger', label: `문제 ${errorCount}건`, detail: savedVersionDetail, isChecking: false, canRetry: true }
	}
	return { tone: 'success', label: '문제 없음', detail: savedVersionDetail, isChecking: false, canRetry: true }
}
