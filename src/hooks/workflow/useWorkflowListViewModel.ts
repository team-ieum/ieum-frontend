import { useMemo } from 'react'
import { useWorkflowListCommands } from '@/hooks/workflow/useWorkflowListCommands'
import { useWorkflowListResource } from '@/hooks/workflow/useWorkflowListResource'
import { useWorkflowListUiState } from '@/hooks/workflow/useWorkflowListUiState'
import type { WorkflowListViewModel } from '@/types/workflowList'
import { mapWorkflowListItemToRowView } from '@/utils/workflow/mapWorkflowListItemToRowView'
import { selectActiveWorkflowFilters, selectWorkflowCounts, selectWorkflows } from '@/utils/workflow/workflowListSelectors'

export const useWorkflowListViewModel = (): WorkflowListViewModel => {
	const uiState = useWorkflowListUiState()
	const { allWorkflows, ...listResource } = useWorkflowListResource()
	const commands = useWorkflowListCommands()
	const { filters, search, sort } = uiState

	const counts = useMemo(() => selectWorkflowCounts(allWorkflows), [allWorkflows])
	const filteredWorkflows = useMemo(
		() => selectWorkflows(allWorkflows, filters, search, sort),
		[allWorkflows, filters, search, sort]
	)
	const workflows = useMemo(() => filteredWorkflows.map(mapWorkflowListItemToRowView), [filteredWorkflows])
	const activeFilters = useMemo(() => selectActiveWorkflowFilters(filters), [filters])

	return {
		...uiState,
		...listResource,
		...commands,
		...counts,
		workflows,
		activeFilters,
		activeFilterCount: activeFilters.length,
		totalCount: allWorkflows.length,
		isFiltered: activeFilters.length > 0 || search.trim().length > 0,
	}
}
