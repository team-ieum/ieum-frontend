import { WORKFLOW_SERVICE_META } from '@/constants/workflow/workflowList'
import type { WorkflowDto, WorkflowListItem, WorkflowNodeDto, WorkflowServiceId, WorkflowTriggerType } from '@/types/workflowList'

const BRAND_TO_SERVICE: Record<string, WorkflowServiceId> = {
	slack: 'slack',
	notion: 'notion',
	github: 'github',
	google: 'google',
	gmail: 'gmail',
	sheets: 'sheets',
	discord: 'discord',
	airtable: 'airtable',
	jira: 'jira',
	linear: 'linear',
	webhook: 'webhook',
}

const knownServiceIds = new Set(Object.keys(WORKFLOW_SERVICE_META) as WorkflowServiceId[])

const pickServiceId = (value: string): WorkflowServiceId | null => {
	const normalized = value.trim().toLowerCase()
	if (!normalized) return null
	if (BRAND_TO_SERVICE[normalized]) return BRAND_TO_SERVICE[normalized]
	if (knownServiceIds.has(normalized as WorkflowServiceId)) return normalized as WorkflowServiceId
	return null
}

export const extractServicesFromNodes = (nodes: WorkflowNodeDto[]): WorkflowServiceId[] => {
	const services = new Set<WorkflowServiceId>()

	for (const node of nodes) {
		const brand = typeof node.config?.brand === 'string' ? node.config.brand : ''
		const fromBrand = pickServiceId(brand)
		if (fromBrand) services.add(fromBrand)

		const fromType = pickServiceId(node.type)
		if (fromType) services.add(fromType)
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
	services: extractServicesFromNodes(dto.nodes ?? []),
	category: 'ops',
	status: dto.active ? 'active' : 'paused',
	trigger: normalizeTrigger(dto.triggerType),
	cronExpression: dto.cronExpression,
	nodeCount: dto.nodes?.length ?? 0,
	updatedAt: dto.updatedAt,
	lastRun: dto.updatedAt,
	success: 0,
})
