import { WORKFLOW_SERVICE_META, WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import type { WorkflowListItem, WorkflowListRowView } from '@/types/workflowList'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { describeCron } from '@/utils/workflow/describeCron'

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
		cronExpression: workflow.cronExpression,
		scheduleLabel:
			workflow.trigger === 'schedule' && workflow.cronExpression ? describeCron(workflow.cronExpression) : undefined,
	}
}
