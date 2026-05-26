import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntegrationService, IntegrationTabId, IntegrationView, UseIntegrationSettingResult } from '../../types/integration'
import { findServiceById, partitionServices } from '../../utils/integration/selectors'

const MOCK_SERVICES: IntegrationService[] = [
	{
		id: 'slack',
		name: 'Slack',
		brand: 'slack',
		status: 'connected',
		account: 'ieum-workspace.slack.com',
		lastSync: '5분 전',
		workflowCount: 4,
		scopes: ['channels:read', 'chat:write', 'users:read'],
	},
	{
		id: 'notion',
		name: 'Notion',
		brand: 'notion',
		status: 'connected',
		account: 'IEUM 팀 워크스페이스',
		lastSync: '12분 전',
		workflowCount: 3,
		scopes: ['pages:read', 'pages:write', 'databases:read'],
	},
	{
		id: 'github',
		name: 'GitHub',
		brand: 'github',
		status: 'connected',
		account: 'ieum-org',
		lastSync: '1시간 전',
		workflowCount: 2,
		scopes: ['repo', 'issues:write', 'workflow'],
	},
	{
		id: 'openai',
		name: 'OpenAI',
		brand: 'openai',
		status: 'error',
		account: 'sk-...7f2a',
		lastSync: '어제',
		workflowCount: 6,
		scopes: ['completions', 'embeddings'],
	},
	{
		id: 'gmail',
		name: 'Gmail',
		brand: 'gmail',
		status: 'available',
		desc: '이메일 발송 및 수신 트리거',
	},
	{
		id: 'sheets',
		name: 'Google Sheets',
		brand: 'sheets',
		status: 'available',
		desc: '스프레드시트 읽기 / 쓰기',
	},
	{
		id: 'jira',
		name: 'Jira',
		brand: 'jira',
		status: 'available',
		desc: '이슈 생성 및 상태 업데이트',
	},
	{
		id: 'airtable',
		name: 'Airtable',
		brand: 'airtable',
		status: 'available',
		desc: '레코드 CRUD 자동화',
	},
	{
		id: 'discord',
		name: 'Discord',
		brand: 'discord',
		status: 'available',
		desc: '채널 메시지 및 웹훅',
	},
	{
		id: 'linear',
		name: 'Linear',
		brand: 'linear',
		status: 'available',
		desc: '이슈 트래킹 연동',
	},
	{
		id: 'webhook',
		name: 'Webhook',
		brand: 'webhook',
		status: 'available',
		desc: '커스텀 HTTP 엔드포인트',
	},
	{
		id: 'google',
		name: 'Google Drive',
		brand: 'google',
		status: 'available',
		desc: '파일 업로드 및 폴더 감시',
	},
]

export const useIntegrationSetting = (): UseIntegrationSettingResult => {
	const [view, setView] = useState<IntegrationView>({ kind: 'list' })
	const [activeTab, setActiveTab] = useState<IntegrationTabId>('connected')

	const availableSectionRef = useRef<HTMLElement>(null)
	const shouldScrollToAvailableRef = useRef(false)

	const { connected, available } = useMemo(() => partitionServices(MOCK_SERVICES), [])

	const currentService = view.kind === 'detail' ? findServiceById(MOCK_SERVICES, view.id) : undefined

	const goDetail = useCallback((id: string) => {
		setView({ kind: 'detail', id })
	}, [])

	const goList = useCallback(() => {
		setView({ kind: 'list' })
	}, [])

	const handleTabChange = useCallback((tab: IntegrationTabId) => {
		if (tab === 'available') {
			shouldScrollToAvailableRef.current = true
			setView(prev => (prev.kind === 'detail' ? { kind: 'list' } : prev))
		}
		setActiveTab(tab)
	}, [])

	useEffect(() => {
		if (!shouldScrollToAvailableRef.current || activeTab !== 'available' || view.kind !== 'list') {
			return
		}

		shouldScrollToAvailableRef.current = false
		requestAnimationFrame(() => {
			availableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}, [activeTab, view.kind])

	return {
		view,
		activeTab,
		connected,
		available,
		currentService,
		connectedCount: connected.length,
		availableCount: available.length,
		isListView: view.kind === 'list',
		availableSectionRef,
		goDetail,
		goList,
		handleTabChange,
	}
}
