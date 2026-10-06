import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
	isCanonicalWorkflowViewParams,
	parseWorkflowViewMode,
	serializeWorkflowViewMode,
} from '@/utils/workflow/workflowListViewParams'
import type {
	WorkflowActiveFilter,
	WorkflowCategoryId,
	WorkflowListFilters,
	WorkflowListViewModel,
	WorkflowServiceId,
	WorkflowSortKey,
	WorkflowStatus,
	WorkflowViewMode,
} from '@/types/workflowList'

type WorkflowListUiState = Pick<
	WorkflowListViewModel,
	| 'search'
	| 'sort'
	| 'view'
	| 'filters'
	| 'toggleService'
	| 'toggleCategory'
	| 'toggleStatus'
	| 'removeFilter'
	| 'clearFilters'
	| 'onSearchChange'
	| 'onSortChange'
	| 'onViewChange'
>

const createEmptyFilters = (): WorkflowListFilters => ({
	services: [],
	categories: [],
	statuses: [],
})

const toggleValue = <T extends string>(values: T[], value: T): T[] =>
	values.includes(value) ? values.filter(item => item !== value) : [...values, value]

export const useWorkflowListUiState = (): WorkflowListUiState => {
	const [searchParams, setSearchParams] = useSearchParams()
	const [search, setSearch] = useState('')
	const [sort, setSort] = useState<WorkflowSortKey>('recent')
	const [filters, setFilters] = useState<WorkflowListFilters>(() => createEmptyFilters())
	const view = parseWorkflowViewMode(searchParams)
	const shouldNormalizeView = !isCanonicalWorkflowViewParams(searchParams)

	useEffect(() => {
		if (!shouldNormalizeView) {
			return
		}

		setSearchParams(serializeWorkflowViewMode(searchParams, view), { replace: true })
	}, [searchParams, setSearchParams, shouldNormalizeView, view])

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
	const onViewChange = useCallback(
		(value: WorkflowViewMode) => {
			if (value === view) {
				return
			}

			setSearchParams(serializeWorkflowViewMode(searchParams, value))
		},
		[searchParams, setSearchParams, view]
	)

	return {
		search,
		sort,
		view,
		filters,
		toggleService,
		toggleCategory,
		toggleStatus,
		removeFilter,
		clearFilters,
		onSearchChange,
		onSortChange,
		onViewChange,
	}
}
