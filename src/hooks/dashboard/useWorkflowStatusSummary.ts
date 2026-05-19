import { dashboardMock } from '../../mocks/dashboard/dashboardMock'
import type { UseWorkflowStatusSummaryResult } from '../../types/dashboard'

export const useWorkflowStatusSummary = (): UseWorkflowStatusSummaryResult => {
	const { workflow } = dashboardMock

	return { workflow }
}
