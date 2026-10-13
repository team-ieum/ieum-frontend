import { WORKFLOW_SERVICE_META, WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowListItem, WorkflowListRowView } from '@/types/workflowList'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { formatCronExpression } from '@/utils/workflow/formatCronExpression'

const toScheduleLabel = (workflow: WorkflowListItem): string | null => {
	const cronExpression = workflow.cronExpression?.trim()
	if (workflow.trigger !== 'schedule' || !cronExpression) return null
	return formatCronExpression(cronExpression) ?? cronExpression
}

export const mapWorkflowListItemToRowView = (workflow: WorkflowListItem): WorkflowListRowView => {
	const updatedAt = workflow.updatedAt ?? workflow.lastRun
	const serviceNamesLabel = workflow.services.map(serviceId => WORKFLOW_SERVICE_META[serviceId].name).join(' · ')

	return {
		id: workflow.id,
		name: workflow.name,
		services: workflow.services,
		serviceNamesLabel,
		hasServices: workflow.services.length > 0,
		nodeCount: workflow.nodeCount ?? 0,
		updatedAtRelative: formatRelativeTime(updatedAt),
		status: workflow.status,
		statusBarClass: WORKFLOW_STATUS_META[workflow.status].barClass,
		trigger: workflow.trigger,
		scheduleLabel: toScheduleLabel(workflow),
	}
}
