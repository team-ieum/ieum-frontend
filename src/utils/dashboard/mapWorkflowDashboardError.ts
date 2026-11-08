import type { WorkflowDashboardErrorDto } from '@/types/workflowDashboard'
import type { ErrorRow } from '@/types/dashboard'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

// 수동 실행이 정적 검증에서 거부될 때 서버가 남기는 메시지 형식("검증 실패 N건: <첫 오류 message>")의 접두어
const VALIDATION_FAILURE_MESSAGE_PREFIX = '검증 실패 '

const formatErrorCode = (executionId: string): string => {
	const compact = executionId.replace(/-/g, '').toUpperCase()
	return compact.length > 6 ? `ERR-${compact.slice(0, 6)}` : executionId
}

const isValidationFailure = (error: WorkflowDashboardErrorDto): boolean =>
	error.failedNodeId === null && error.errorMessage.startsWith(VALIDATION_FAILURE_MESSAGE_PREFIX)

export const mapWorkflowDashboardErrorToRow = (error: WorkflowDashboardErrorDto): ErrorRow => ({
	id: error.executionId,
	kind: isValidationFailure(error) ? 'validation' : 'execution',
	workflowId: error.workflowId,
	code: formatErrorCode(error.executionId),
	severity: 'error',
	title: error.errorMessage,
	flow: error.workflowName,
	when: formatRelativeTime(error.finishedAt ?? error.startedAt),
})
