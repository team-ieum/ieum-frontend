import { useCallback, useMemo, useState } from 'react'
import { dashboardMock } from '../../mocks/dashboard/dashboardMock'

const ERROR_PREVIEW_COUNT = 3

export const useDashboardErrorSummary = () => {
	const { errors } = dashboardMock
	const [isExpanded, setIsExpanded] = useState(false)

	const hasMore = errors.length > ERROR_PREVIEW_COUNT
	const visibleErrors = useMemo(() => (isExpanded ? errors : errors.slice(0, ERROR_PREVIEW_COUNT)), [isExpanded, errors])

	const toggleExpanded = useCallback(() => {
		setIsExpanded(prev => !prev)
	}, [])

	return {
		visibleErrors,
		errorCount: errors.length,
		hasMore,
		isExpanded,
		toggleExpanded,
	}
}
