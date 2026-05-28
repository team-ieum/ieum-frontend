import { useCallback, useMemo, useState } from 'react'
import type { ErrorRow, UseDashboardErrorSummaryResult } from '../../types/dashboard'

const ERROR_PREVIEW_COUNT = 3

const MOCK_ERRORS: ErrorRow[] = [
	{ code: 'ERR-088', severity: 'error', title: 'API rate limit exceeded', flow: '신규 리드 CRM 등록', when: '28분 전' },
	{ code: 'ERR-087', severity: 'error', title: 'OAuth token expired', flow: '이메일 분류 및 라벨링', when: '2시간 전' },
	{ code: 'ERR-086', severity: 'warning', title: 'Channel not found', flow: 'Slack 주간 리포트', when: '어제 16:12' },
	{ code: 'ERR-085', severity: 'warning', title: 'Webhook timeout', flow: 'GitHub 이슈 → Notion 동기화', when: '어제 09:40' },
	{ code: 'ERR-084', severity: 'error', title: 'Invalid spreadsheet range', flow: 'Google Sheets 데이터 수집', when: '2일 전' },
]

export const useDashboardErrorSummary = (): UseDashboardErrorSummaryResult => {
	const [isExpanded, setIsExpanded] = useState(false)

	const hasMore = MOCK_ERRORS.length > ERROR_PREVIEW_COUNT
	const visibleErrors = useMemo(() => (isExpanded ? MOCK_ERRORS : MOCK_ERRORS.slice(0, ERROR_PREVIEW_COUNT)), [isExpanded])

	const toggleExpanded = useCallback(() => {
		setIsExpanded(prev => !prev)
	}, [])

	return {
		visibleErrors,
		errorCount: MOCK_ERRORS.length,
		hasMore,
		isExpanded,
		toggleExpanded,
	}
}
