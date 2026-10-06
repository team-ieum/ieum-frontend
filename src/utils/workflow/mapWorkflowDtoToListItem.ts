import { WORKFLOW_SERVICE_META } from '@/constants/workflow/workflowList'
import type { WorkflowDto, WorkflowListItem, WorkflowServiceId, WorkflowTriggerType } from '@/types/workflowList'

const knownServiceIds = new Set(Object.keys(WORKFLOW_SERVICE_META) as WorkflowServiceId[])

const pickServiceId = (value: string): WorkflowServiceId | null => {
	const normalized = value.trim().toLowerCase()
	return knownServiceIds.has(normalized as WorkflowServiceId) ? (normalized as WorkflowServiceId) : null
}

export const normalizeServiceIds = (values: string[]): WorkflowServiceId[] => {
	const services = new Set<WorkflowServiceId>()

	for (const value of values) {
		const serviceId = pickServiceId(value)
		if (serviceId) services.add(serviceId)
	}

	return [...services]
}

const normalizeTrigger = (triggerType: string): WorkflowTriggerType => {
	const normalized = triggerType.trim().toLowerCase()
	if (normalized === 'schedule' || normalized === 'webhook' || normalized === 'event' || normalized === 'manual') {
		return normalized
	}
	return 'manual'
}

export const mapWorkflowDtoToListItem = (dto: WorkflowDto): WorkflowListItem => ({
	id: dto.id,
	name: dto.name,
	desc: dto.description ?? '',
	tags: [],
	services: normalizeServiceIds(dto.services),
	category: 'ops',
	status: dto.active ? 'active' : 'paused',
	trigger: normalizeTrigger(dto.triggerType),
	cronExpression: dto.cronExpression,
	nodeCount: dto.nodes?.length ?? 0,
	updatedAt: dto.updatedAt,
	lastRun: dto.updatedAt,
	success: 0,
})
