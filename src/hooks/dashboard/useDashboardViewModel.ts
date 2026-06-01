import { useMemo } from 'react'
import { useWorkflowDashboardErrorsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardErrorsQuery'
import { useWorkflowDashboardExecutionsQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardExecutionsQuery'
import { useWorkflowDashboardSummaryQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardSummaryQuery'
import { useDashboardExpandableSection } from '@/hooks/dashboard/useDashboardExpandableSection'
import type { DashboardViewModel } from '@/types/dashboard'
import { mapDashboardSummaryToHero, mapDashboardSummaryToWorkflow } from '@/utils/dashboard/mapWorkflowDashboardSummary'
import { mapWorkflowExecutionToRunRow } from '@/utils/dashboard/mapWorkflowDashboardExecution'
import { mapWorkflowDashboardErrorToRow } from '@/utils/dashboard/mapWorkflowDashboardError'

const EMPTY_HERO: DashboardViewModel['hero'] = {
	totalRuns: 0,
	changePercent: 0,
	avgDuration: '–',
	successRate: '–',
}

const EMPTY_WORKFLOW: DashboardViewModel['workflow'] = {
	totalCount: 0,
	pills: [],
}

export const useDashboardViewModel = (): DashboardViewModel => {
	const summaryQuery = useWorkflowDashboardSummaryQuery()
	const executionsQuery = useWorkflowDashboardExecutionsQuery()
	const errorsQuery = useWorkflowDashboardErrorsQuery()

	const summaryMapped = useMemo(
		() => (summaryQuery.data ? mapDashboardSummaryToHero(summaryQuery.data) : null),
		[summaryQuery.data]
	)

	const workflow = useMemo(
		() => (summaryQuery.data ? mapDashboardSummaryToWorkflow(summaryQuery.data) : EMPTY_WORKFLOW),
		[summaryQuery.data]
	)

	const runsSection = useDashboardExpandableSection({
		previewCount: 5,
		expandLabel: '전체 이력 보기',
		query: executionsQuery,
		mapItem: mapWorkflowExecutionToRunRow,
	})

	const errorsSection = useDashboardExpandableSection({
		previewCount: 3,
		expandLabel: '전체 오류 이력 보기',
		query: errorsQuery,
		mapItem: mapWorkflowDashboardErrorToRow,
	})

	return {
		hero: summaryMapped?.hero ?? EMPTY_HERO,
		hourlyExecutions: summaryMapped?.hourlyExecutions ?? [],
		isSummaryLoading: summaryQuery.isLoading,
		isSummaryError: summaryQuery.isError,
		workflow,
		runs: {
			visibleItems: runsSection.visibleItems,
			hasMore: runsSection.hasMore,
			isExpanded: runsSection.isExpanded,
			isLoading: runsSection.isLoading,
			isError: runsSection.isError,
			footerLabel: runsSection.footerLabel,
			handleFooterClick: runsSection.handleFooterClick,
		},
		errors: {
			visibleItems: errorsSection.visibleItems,
			errorCount: errorsSection.allItems.length,
			hasMore: errorsSection.hasMore,
			isExpanded: errorsSection.isExpanded,
			isLoading: errorsSection.isLoading,
			isError: errorsSection.isError,
			footerLabel: errorsSection.footerLabel,
			handleFooterClick: errorsSection.handleFooterClick,
		},
	}
}
