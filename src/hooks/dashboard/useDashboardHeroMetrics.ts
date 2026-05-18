import { dashboardMock } from '../../mocks/dashboard/dashboardMock'

export const useDashboardHeroMetrics = () => {
	const { hero, hourlyExecutions } = dashboardMock

	return { hero, hourlyExecutions }
}
