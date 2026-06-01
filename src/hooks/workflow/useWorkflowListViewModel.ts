import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
	WORKFLOW_CATEGORY_META,
	WORKFLOW_SERVICE_META,
	WORKFLOW_STATUS_META,
	WORKFLOW_STATUS_ORDER,
	WORKFLOW_TRIGGER_META,
} from '@/constants/workflow/workflowList'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import { useCreateWorkflowMutation } from '@/hooks/workflow/mutations/useCreateWorkflowMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import type {
	WorkflowActiveFilter,
	WorkflowCategoryId,
	WorkflowDto,
	WorkflowListFilters,
	WorkflowListItem,
	WorkflowServiceId,
	WorkflowSortKey,
	WorkflowStatus,
	WorkflowTriggerType,
	WorkflowViewMode,
	WorkflowListViewModel,
} from '@/types/workflowList'

const toWorkflowListItem = (dto: WorkflowDto): WorkflowListItem => ({
	id: dto.id,
	name: dto.name,
	desc: dto.description,
	tags: [],
	services: [],
	category: 'ops',
	status: dto.active ? 'active' : 'paused',
	trigger: dto.triggerType.toLowerCase() as WorkflowTriggerType,
	lastRun: dto.updatedAt,
	success: 0,
})

const createEmptyFilters = (): WorkflowListFilters => ({
	services: [],
	categories: [],
	statuses: [],
})

const toggleValue = <T extends string>(values: T[], value: T): T[] =>
	values.includes(value) ? values.filter(item => item !== value) : [...values, value]

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

export const useWorkflowListViewModel = (): WorkflowListViewModel => {
	const navigate = useNavigate()
	const [search, setSearch] = useState('')
	const [sort, setSort] = useState<WorkflowSortKey>('recent')
	const [view, setView] = useState<WorkflowViewMode>('card')
	const [filters, setFilters] = useState<WorkflowListFilters>(() => createEmptyFilters())

	const { data, isLoading, isError, error, hasNextPage, fetchNextPage } = useWorkflowListQuery()
	const openModal = useModalStore(state => state.open)
	const createMutation = useCreateWorkflowMutation()

	useEffect(() => {
		if (isError && error) {
			const message = isApiError(error) ? error.message : '워크플로우를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'
			openModal('오류', message)
		}
	}, [isError, error, openModal])

	const allWorkflows = useMemo<WorkflowListItem[]>(
		() => (data?.pages ?? []).flatMap(page => page.data.content.map(toWorkflowListItem)),
		[data]
	)

	const serviceCounts = useMemo(() => {
		const serviceIds = allWorkflows.flatMap(workflow => workflow.services)
		return createCountMap(serviceIds, Object.keys(WORKFLOW_SERVICE_META) as WorkflowServiceId[])
	}, [allWorkflows])

	const categoryCounts = useMemo(() => {
		const categoryIds = allWorkflows.map(workflow => workflow.category)
		return createCountMap(categoryIds, Object.keys(WORKFLOW_CATEGORY_META) as WorkflowCategoryId[])
	}, [allWorkflows])

	const statusCounts = useMemo(() => {
		const statusIds = allWorkflows.map(workflow => workflow.status)
		return createCountMap(statusIds, Object.keys(WORKFLOW_STATUS_META) as WorkflowStatus[])
	}, [allWorkflows])

	const workflows = useMemo(
		() =>
			sortWorkflows(
				allWorkflows.filter(workflow => filterWorkflow(workflow, filters, search)),
				sort
			),
		[allWorkflows, filters, search, sort]
	)

	const activeFilters = useMemo<WorkflowActiveFilter[]>(
		() => [
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
		],
		[filters]
	)

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

	const onSearchChange = useCallback((value: string) => setSearch(value), [])
	const onSortChange = useCallback((value: WorkflowSortKey) => setSort(value), [])
	const onViewChange = useCallback((value: WorkflowViewMode) => setView(value), [])

	const handleCreateWorkflow = useCallback(async () => {
		try {
			const res = await createMutation.mutateAsync({
				name: '새 워크플로우',
				description: '새로 생성된 워크플로우입니다.',
				nodes: [],
				edges: [],
				triggerType: 'MANUAL',
			})
			navigate(`/workflow/${res.data.id}`)
		} catch (err) {
			if (isApiError(err)) {
				openModal('오류', err.message)
			} else {
				openModal('오류', '워크플로우 생성에 실패했어요. 다시 시도해주세요.')
			}
		}
	}, [createMutation, navigate, openModal])

	const handleOpenWorkflow = useCallback(
		(workflowId: string, workflowName: string) => {
			navigate(`/workflow/${workflowId}`, { state: { name: workflowName } })
		},
		[navigate]
	)

	return {
		search,
		sort,
		view,
		filters,
		workflows,
		activeFilters,
		activeFilterCount: activeFilters.length,
		totalCount: allWorkflows.length,
		serviceCounts,
		categoryCounts,
		statusCounts,
		isLoading,
		isError,
		hasNextPage: hasNextPage ?? false,
		fetchNextPage,
		toggleService,
		toggleCategory,
		toggleStatus,
		removeFilter,
		clearFilters,
		onSearchChange,
		onSortChange,
		onViewChange,
		handleCreateWorkflow,
		handleOpenWorkflow,
	}
}
