import {
	WORKFLOW_CATEGORY_META,
	WORKFLOW_SERVICE_META,
	WORKFLOW_STATUS_META,
	WORKFLOW_STATUS_ORDER,
	WORKFLOW_TRIGGER_META,
} from '@/constants/workflow/workflowList'
import type {
	WorkflowActiveFilter,
	WorkflowCategoryId,
	WorkflowListFilters,
	WorkflowListItem,
	WorkflowListViewModel,
	WorkflowServiceId,
	WorkflowSortKey,
	WorkflowStatus,
} from '@/types/workflowList'

const createCountMap = <T extends string>(values: T[], initialValues: T[]): Record<T, number> => {
	const countMap = initialValues.reduce(
		(acc, value) => {
			acc[value] = 0
			return acc
		},
		{} as Record<T, number>
	)

	values.forEach(value => {
		countMap[value] = (countMap[value] ?? 0) + 1
	})

	return countMap
}

const matchesSearch = (workflow: WorkflowListItem, search: string): boolean => {
	const query = search.trim().toLocaleLowerCase('ko-KR')

	if (!query) {
		return true
	}

	const serviceNames = workflow.services.map(serviceId => WORKFLOW_SERVICE_META[serviceId].name)
	const searchableText = [
		workflow.name,
		workflow.desc,
		WORKFLOW_CATEGORY_META[workflow.category].label,
		WORKFLOW_STATUS_META[workflow.status].label,
		WORKFLOW_TRIGGER_META[workflow.trigger].label,
		...serviceNames,
	]
		.join(' ')
		.toLocaleLowerCase('ko-KR')

	return searchableText.includes(query)
}

const filterWorkflow = (workflow: WorkflowListItem, filters: WorkflowListFilters, search: string): boolean => {
	const matchesService =
		filters.services.length === 0 || workflow.services.some(serviceId => filters.services.includes(serviceId))
	const matchesCategory = filters.categories.length === 0 || filters.categories.includes(workflow.category)
	const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(workflow.status)

	return matchesService && matchesCategory && matchesStatus && matchesSearch(workflow, search)
}

const getLastRunTime = (workflow: WorkflowListItem): number => new Date(workflow.lastRun).getTime()

const sortWorkflows = (workflows: WorkflowListItem[], sort: WorkflowSortKey): WorkflowListItem[] => {
	const sorted = [...workflows]

	switch (sort) {
		case 'name':
			return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
		case 'status':
			return sorted.sort((a, b) => WORKFLOW_STATUS_ORDER.indexOf(a.status) - WORKFLOW_STATUS_ORDER.indexOf(b.status))
		case 'recent':
		default:
			return sorted.sort((a, b) => getLastRunTime(b) - getLastRunTime(a))
	}
}

export const selectWorkflows = (
	workflows: WorkflowListItem[],
	filters: WorkflowListFilters,
	search: string,
	sort: WorkflowSortKey
): WorkflowListItem[] =>
	sortWorkflows(
		workflows.filter(workflow => filterWorkflow(workflow, filters, search)),
		sort
	)

export const selectWorkflowCounts = (
	workflows: WorkflowListItem[]
): Pick<WorkflowListViewModel, 'serviceCounts' | 'categoryCounts' | 'statusCounts'> => ({
	serviceCounts: createCountMap(
		workflows.flatMap(workflow => workflow.services),
		Object.keys(WORKFLOW_SERVICE_META) as WorkflowServiceId[]
	),
	categoryCounts: createCountMap(
		workflows.map(workflow => workflow.category),
		Object.keys(WORKFLOW_CATEGORY_META) as WorkflowCategoryId[]
	),
	statusCounts: createCountMap(
		workflows.map(workflow => workflow.status),
		Object.keys(WORKFLOW_STATUS_META) as WorkflowStatus[]
	),
})

export const selectActiveWorkflowFilters = (filters: WorkflowListFilters): WorkflowActiveFilter[] => [
	...filters.services.map(serviceId => ({
		kind: 'services' as const,
		id: serviceId,
		label: WORKFLOW_SERVICE_META[serviceId].name,
		serviceId,
	})),
	...filters.categories.map(categoryId => ({
		kind: 'categories' as const,
		id: categoryId,
		label: WORKFLOW_CATEGORY_META[categoryId].label,
		dotClass: WORKFLOW_CATEGORY_META[categoryId].dotClass,
	})),
	...filters.statuses.map(status => ({
		kind: 'statuses' as const,
		id: status,
		label: WORKFLOW_STATUS_META[status].label,
		status,
	})),
]
