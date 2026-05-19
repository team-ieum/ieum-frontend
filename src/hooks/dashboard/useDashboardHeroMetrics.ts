import { dashboardMock } from '../../mocks/dashboard/dashboardMock'
import type { UseDashboardHeroMetricsResult } from '../../types/dashboard'

export const useDashboardHeroMetrics = (): UseDashboardHeroMetricsResult => {
	const { hero, hourlyExecutions } = dashboardMock

	return { hero, hourlyExecutions }
}
