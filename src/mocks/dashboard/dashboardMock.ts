import type { DashboardData, ErrorRow, HourlyExecution, RunRow, StatusPillItem } from '../../types/dashboard'

const hourlyExecutions: HourlyExecution[] = [
	{ t: '00', count: 28 },
	{ t: '02', count: 14 },
	{ t: '04', count: 9 },
	{ t: '06', count: 32 },
	{ t: '08', count: 86 },
	{ t: '10', count: 142 },
	{ t: '12', count: 168 },
	{ t: '14', count: 195 },
	{ t: '16', count: 224 },
	{ t: '18', count: 162 },
	{ t: '20', count: 98 },
	{ t: '22', count: 82 },
	{ t: '24', count: 54 },
]

const runs: RunRow[] = [
	{ id: 'RUN-1042', name: 'Slack 주간 리포트 자동화', status: 'success', time: '1.2s', trigger: '스케줄', when: '5분 전' },
	{ id: 'RUN-1041', name: 'GitHub 이슈 → Notion 동기화', status: 'success', time: '0.8s', trigger: '웹훅', when: '12분 전' },
	{ id: 'RUN-1040', name: '신규 리드 CRM 등록', status: 'error', time: '3.1s', trigger: '웹훅', when: '28분 전' },
	{ id: 'RUN-1039', name: 'Google Sheets 데이터 수집', status: 'success', time: '2.4s', trigger: '스케줄', when: '1시간 전' },
	{ id: 'RUN-1038', name: 'Slack 주간 리포트 자동화', status: 'running', time: '–', trigger: '수동', when: '1시간 전' },
	{ id: 'RUN-1037', name: '이메일 분류 및 라벨링', status: 'error', time: '0.5s', trigger: '스케줄', when: '2시간 전' },
	{ id: 'RUN-1036', name: '신규 리드 CRM 등록', status: 'success', time: '1.9s', trigger: '웹훅', when: '3시간 전' },
]

const errors: ErrorRow[] = [
	{ code: 'ERR-088', severity: 'error', title: 'API rate limit exceeded', flow: '신규 리드 CRM 등록', when: '28분 전' },
	{ code: 'ERR-087', severity: 'error', title: 'OAuth token expired', flow: '이메일 분류 및 라벨링', when: '2시간 전' },
	{ code: 'ERR-086', severity: 'warning', title: 'Channel not found', flow: 'Slack 주간 리포트', when: '어제 16:12' },
	{ code: 'ERR-085', severity: 'warning', title: 'Webhook timeout', flow: 'GitHub 이슈 → Notion 동기화', when: '어제 09:40' },
	{ code: 'ERR-084', severity: 'error', title: 'Invalid spreadsheet range', flow: 'Google Sheets 데이터 수집', when: '2일 전' },
]

const workflowPills: StatusPillItem[] = [
	{ label: '활성', value: 8, sub: '정상 실행 중', tone: 'active' },
	{ label: '비활성', value: 3, sub: '중지됨', tone: 'inactive' },
	{ label: '오류 있음', value: 1, sub: '점검 필요', tone: 'error' },
	{ label: '실행 중', value: 2, sub: '지금 처리 중', tone: 'running' },
]

export const dashboardMock: DashboardData = {
	hero: {
		totalRuns: 1240,
		changePercent: 12,
		avgDuration: '1.6s',
		successRate: '97.8%',
	},
	hourlyExecutions,
	workflow: {
		totalCount: 12,
		pills: workflowPills,
	},
	runs,
	errors,
}
