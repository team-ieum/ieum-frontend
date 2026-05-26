import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
	WORKFLOW_CATEGORY_META,
	WORKFLOW_SERVICE_META,
	WORKFLOW_STATUS_META,
	WORKFLOW_STATUS_ORDER,
	WORKFLOW_TRIGGER_META,
} from '@/constants/workflow/workflowList'
import { WORKFLOW_LIST } from '@/mocks/workflow/workflowListMock'
import type {
	WorkflowCategoryId,
	WorkflowListFilters,
	WorkflowListItem,
	WorkflowServiceId,
	WorkflowSortKey,
	WorkflowStatus,
	WorkflowViewMode,
} from '@/types/workflowList'

export type WorkflowActiveFilter = {
	kind: keyof WorkflowListFilters
	id: string
	label: string
	color?: string
	serviceId?: WorkflowServiceId
	status?: WorkflowStatus
}

const createEmptyFilters = (): WorkflowListFilters => ({
	services: [],
	categories: [],
	statuses: [],
})

const toggleValue = <T extends string>(values: T[], value: T) =>
	values.includes(value) ? values.filter(item => item !== value) : [...values, value]

const createCountMap = <T extends string>(values: T[], initialValues: T[]) => {
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

const matchesSearch = (workflow: WorkflowListItem, search: string) => {
	const query = search.trim().toLocaleLowerCase('ko-KR')

	if (!query) {
		return true
	}

	const serviceNames = workflow.services.map(serviceId => WORKFLOW_SERVICE_META[serviceId].name)
	const searchableText = [
		workflow.name,
		WORKFLOW_CATEGORY_META[workflow.category].label,
		WORKFLOW_STATUS_META[workflow.status].label,
		WORKFLOW_TRIGGER_META[workflow.trigger].label,
		...serviceNames,
	]
		.join(' ')
		.toLocaleLowerCase('ko-KR')

	return searchableText.includes(query)
}

const filterWorkflow = (workflow: WorkflowListItem, filters: WorkflowListFilters, search: string) => {
	const matchesService =
		filters.services.length === 0 || workflow.services.some(serviceId => filters.services.includes(serviceId))
	const matchesCategory = filters.categories.length === 0 || filters.categories.includes(workflow.category)
	const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(workflow.status)

	return matchesService && matchesCategory && matchesStatus && matchesSearch(workflow, search)
}

const sortWorkflows = (workflows: WorkflowListItem[], sort: WorkflowSortKey) => {
	const sorted = [...workflows]

	switch (sort) {
		case 'name':
			return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
		case 'runs':
			return sorted.sort((a, b) => b.runs - a.runs)
		case 'status':
			return sorted.sort((a, b) => WORKFLOW_STATUS_ORDER.indexOf(a.status) - WORKFLOW_STATUS_ORDER.indexOf(b.status))
		case 'recent':
		default:
			return sorted
	}
}

export const useWorkflowListViewModel = () => {
	const navigate = useNavigate()
	const [search, setSearch] = useState('')
	const [sort, setSort] = useState<WorkflowSortKey>('recent')
	const [view, setView] = useState<WorkflowViewMode>('card')
	const [filters, setFilters] = useState<WorkflowListFilters>(() => createEmptyFilters())

	const serviceCounts = useMemo(() => {
		const serviceIds = WORKFLOW_LIST.flatMap(workflow => workflow.services)
		return createCountMap(serviceIds, Object.keys(WORKFLOW_SERVICE_META) as WorkflowServiceId[])
	}, [])

	const categoryCounts = useMemo(() => {
		const categoryIds = WORKFLOW_LIST.map(workflow => workflow.category)
		return createCountMap(categoryIds, Object.keys(WORKFLOW_CATEGORY_META) as WorkflowCategoryId[])
	}, [])

	const statusCounts = useMemo(() => {
		const statusIds = WORKFLOW_LIST.map(workflow => workflow.status)
		return createCountMap(statusIds, Object.keys(WORKFLOW_STATUS_META) as WorkflowStatus[])
	}, [])

	const workflows = useMemo(() => {
		return sortWorkflows(
			WORKFLOW_LIST.filter(workflow => filterWorkflow(workflow, filters, search)),
			sort
		)
	}, [filters, search, sort])

	const activeFilters = useMemo<WorkflowActiveFilter[]>(() => {
		return [
			...filters.services.map(serviceId => ({
				kind: 'services' as const,
				id: serviceId,
				label: WORKFLOW_SERVICE_META[serviceId].name,
				color: WORKFLOW_SERVICE_META[serviceId].color,
				serviceId,
			})),
			...filters.categories.map(categoryId => ({
				kind: 'categories' as const,
				id: categoryId,
				label: WORKFLOW_CATEGORY_META[categoryId].label,
				color: WORKFLOW_CATEGORY_META[categoryId].color,
			})),
			...filters.statuses.map(status => ({
				kind: 'statuses' as const,
				id: status,
				label: WORKFLOW_STATUS_META[status].label,
				color: WORKFLOW_STATUS_META[status].dotColor,
				status,
			})),
		]
	}, [filters])

	const toggleService = useCallback((serviceId: WorkflowServiceId) => {
		setFilters(prev => ({ ...prev, services: toggleValue(prev.services, serviceId) }))
	}, [])

	const toggleCategory = useCallback((categoryId: WorkflowCategoryId) => {
		setFilters(prev => ({ ...prev, categories: toggleValue(prev.categories, categoryId) }))
	}, [])

	const toggleStatus = useCallback((status: WorkflowStatus) => {
		setFilters(prev => ({ ...prev, statuses: toggleValue(prev.statuses, status) }))
	}, [])

	const removeFilter = useCallback((filter: WorkflowActiveFilter) => {
		setFilters(prev => ({
			...prev,
			[filter.kind]: prev[filter.kind].filter(value => value !== filter.id),
		}))
	}, [])

	const clearFilters = useCallback(() => {
		setFilters(createEmptyFilters())
		setSearch('')
	}, [])

	const handleCreateWorkflow = useCallback(() => {
		navigate('/workflow/new')
	}, [navigate])

	const handleOpenWorkflow = useCallback(() => {
		navigate('/workflow/new')
	}, [navigate])

	return {
		search,
		setSearch,
		sort,
		setSort,
		view,
		setView,
		filters,
		workflows,
		activeFilters,
		activeFilterCount: activeFilters.length,
		totalCount: WORKFLOW_LIST.length,
		serviceCounts,
		categoryCounts,
		statusCounts,
		toggleService,
		toggleCategory,
		toggleStatus,
		removeFilter,
		clearFilters,
		handleCreateWorkflow,
		handleOpenWorkflow,
	}
}
