import type { WorkflowExecutionDto } from '@/types/workflowDashboard'
import type { RunRow, RunStatus } from '@/types/dashboard'
import { formatDashboardDuration } from '@/utils/dashboard/mapWorkflowDashboardSummary'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const TRIGGER_LABELS: Record<string, string> = {
	MANUAL: '수동',
	SCHEDULE: '스케줄',
	CRON: '스케줄',
	WEBHOOK: '웹훅',
	EVENT: '웹훅',
}

const mapExecutionStatus = (status: string): RunStatus => {
	const normalized = status.toUpperCase()
	if (['SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(normalized)) return 'success'
	if (['FAILED', 'FAILURE', 'ERROR', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'error'
	return 'running'
}

const mapTriggerLabel = (triggerType: string): string => TRIGGER_LABELS[triggerType.toUpperCase()] ?? triggerType

const formatRunDisplayId = (id: string): string => {
	const compact = id.replace(/-/g, '').toUpperCase()
	return compact.length > 8 ? `RUN-${compact.slice(0, 8)}` : id
}

const mapDuration = (status: RunStatus, durationSeconds: number): string => {
	if (status === 'running' && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) return '–'
	return formatDashboardDuration(durationSeconds)
}

export const mapWorkflowExecutionToRunRow = (execution: WorkflowExecutionDto): RunRow => {
	const status = mapExecutionStatus(execution.status)
	const whenSource = execution.finishedAt ?? execution.startedAt

	return {
		id: execution.id,
		displayId: formatRunDisplayId(execution.id),
		name: execution.workflowName,
		status,
		time: mapDuration(status, execution.durationSeconds),
		trigger: mapTriggerLabel(execution.triggerType),
		when: formatRelativeTime(whenSource),
	}
}
