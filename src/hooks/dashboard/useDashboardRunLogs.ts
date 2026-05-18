import { useCallback, useMemo, useState } from 'react'
import { dashboardMock } from '../../mocks/dashboard/dashboardMock'

const RUN_LOG_PREVIEW_COUNT = 5

export const useDashboardRunLogs = () => {
	const { runs } = dashboardMock
	const [isExpanded, setIsExpanded] = useState(false)

	const hasMore = runs.length > RUN_LOG_PREVIEW_COUNT
	const visibleRuns = useMemo(() => (isExpanded ? runs : runs.slice(0, RUN_LOG_PREVIEW_COUNT)), [isExpanded, runs])

	const toggleExpanded = useCallback(() => {
		setIsExpanded(prev => !prev)
	}, [])

	return { visibleRuns, hasMore, isExpanded, toggleExpanded }
}
