import { useMemo } from 'react'
import { useWorkflowDashboardSummaryQuery } from '@/hooks/dashboard/queries/useWorkflowDashboardSummaryQuery'
import type { DashboardHeroMetrics, HourlyExecution, UseDashboardHeroMetricsResult } from '@/types/dashboard'
import { mapDashboardSummaryToHero } from '@/utils/dashboard/mapWorkflowDashboardSummary'

const EMPTY_HERO: DashboardHeroMetrics = {
	totalRuns: 0,
	changePercent: 0,
	avgDuration: '–',
	successRate: '–',
}

export const useDashboardHeroMetrics = (): UseDashboardHeroMetricsResult => {
	const { data, isLoading, isError } = useWorkflowDashboardSummaryQuery()

	const mapped = useMemo(() => (data ? mapDashboardSummaryToHero(data) : null), [data])

	return {
		hero: mapped?.hero ?? EMPTY_HERO,
		hourlyExecutions: mapped?.hourlyExecutions ?? ([] as HourlyExecution[]),
		isLoading,
		isError,
	}
}
