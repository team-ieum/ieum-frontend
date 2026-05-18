import { dashboardMock } from '../../mocks/dashboard/dashboardMock'

export const useWorkflowStatusSummary = () => {
	const { workflow } = dashboardMock

	return { workflow }
}
