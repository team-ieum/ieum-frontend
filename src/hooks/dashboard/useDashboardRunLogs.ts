import { useCallback, useMemo, useState } from 'react'
import type { RunRow, UseDashboardRunLogsResult } from '../../types/dashboard'

const RUN_LOG_PREVIEW_COUNT = 5

const MOCK_RUNS: RunRow[] = [
	{ id: 'RUN-1042', name: 'Slack 주간 리포트 자동화', status: 'success', time: '1.2s', trigger: '스케줄', when: '5분 전' },
	{ id: 'RUN-1041', name: 'GitHub 이슈 → Notion 동기화', status: 'success', time: '0.8s', trigger: '웹훅', when: '12분 전' },
	{ id: 'RUN-1040', name: '신규 리드 CRM 등록', status: 'error', time: '3.1s', trigger: '웹훅', when: '28분 전' },
	{ id: 'RUN-1039', name: 'Google Sheets 데이터 수집', status: 'success', time: '2.4s', trigger: '스케줄', when: '1시간 전' },
	{ id: 'RUN-1038', name: 'Slack 주간 리포트 자동화', status: 'running', time: '–', trigger: '수동', when: '1시간 전' },
	{ id: 'RUN-1037', name: '이메일 분류 및 라벨링', status: 'error', time: '0.5s', trigger: '스케줄', when: '2시간 전' },
	{ id: 'RUN-1036', name: '신규 리드 CRM 등록', status: 'success', time: '1.9s', trigger: '웹훅', when: '3시간 전' },
]

export const useDashboardRunLogs = (): UseDashboardRunLogsResult => {
	const [isExpanded, setIsExpanded] = useState(false)

	const hasMore = MOCK_RUNS.length > RUN_LOG_PREVIEW_COUNT
	const visibleRuns = useMemo(() => (isExpanded ? MOCK_RUNS : MOCK_RUNS.slice(0, RUN_LOG_PREVIEW_COUNT)), [isExpanded])

	const toggleExpanded = useCallback(() => {
		setIsExpanded(prev => !prev)
	}, [])

	return { visibleRuns, hasMore, isExpanded, toggleExpanded }
}
