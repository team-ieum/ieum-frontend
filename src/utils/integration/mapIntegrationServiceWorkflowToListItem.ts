import { INTEGRATION_TRIGGER_LABELS } from '@/constants/integration/integrationTriggerLabels'
import type { IntegrationServiceWorkflowDto, IntegrationServiceWorkflowListItem } from '@/types/integrationWorkflows'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

export const mapIntegrationServiceWorkflowToListItem = (
	workflow: IntegrationServiceWorkflowDto
): IntegrationServiceWorkflowListItem => ({
	id: workflow.id,
	name: workflow.name,
	description: workflow.description,
	isActive: workflow.active,
	triggerLabel: INTEGRATION_TRIGGER_LABELS[workflow.triggerType.toUpperCase()] ?? workflow.triggerType,
	usedNodeCount: workflow.usedNodeCount,
	updatedAtLabel: formatRelativeTime(workflow.updatedAt),
})
