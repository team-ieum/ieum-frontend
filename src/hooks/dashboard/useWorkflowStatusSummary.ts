import { useMemo } from 'react'
import { useWorkflowDashboardSummaryQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardSummaryQuery'
import type { DashboardWorkflowSummary, UseWorkflowStatusSummaryResult } from '@/types/dashboard'
import { mapDashboardSummaryToWorkflow } from '@/utils/dashboard/mapWorkflowDashboardSummary'

const EMPTY_WORKFLOW: DashboardWorkflowSummary = {
	totalCount: 0,
	pills: [],
}

export const useWorkflowStatusSummary = (): UseWorkflowStatusSummaryResult => {
	const { data, isLoading, isError } = useWorkflowDashboardSummaryQuery()

	const workflow = useMemo(() => (data ? mapDashboardSummaryToWorkflow(data) : EMPTY_WORKFLOW), [data])

	return { workflow, isLoading, isError }
}
