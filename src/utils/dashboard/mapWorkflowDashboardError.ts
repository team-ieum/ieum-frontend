import type { WorkflowDashboardErrorDto } from '@/types/workflowDashboard'
import type { ErrorRow } from '@/types/dashboard'
import { formatIntegrationLastSync } from '@/utils/integration/formatIntegrationLastSync'

const formatErrorCode = (executionId: string): string => {
	const compact = executionId.replace(/-/g, '').toUpperCase()
	return compact.length > 6 ? `ERR-${compact.slice(0, 6)}` : executionId
}

export const mapWorkflowDashboardErrorToRow = (error: WorkflowDashboardErrorDto): ErrorRow => ({
	id: error.executionId,
	code: formatErrorCode(error.executionId),
	severity: 'error',
	title: error.errorMessage,
	flow: error.workflowName,
	when: formatIntegrationLastSync(error.finishedAt ?? error.startedAt),
})
