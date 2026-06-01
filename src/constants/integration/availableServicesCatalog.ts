import type { IntegrationService } from '@/types/integration'

/** 연결 가능 서비스 카탈로그 (OAuth·웹훅 등 연동 전 목록) */
export const AVAILABLE_INTEGRATION_CATALOG: IntegrationService[] = [
	{
		id: 'slack',
		name: 'Slack',
		brand: 'slack',
		status: 'available',
		desc: '채널 메시지 전송 및 Incoming Webhook',
	},
	{
		id: 'notion',
		name: 'Notion',
		brand: 'notion',
		status: 'available',
		desc: '페이지·데이터베이스 읽기 / 쓰기',
	},
	{
		id: 'github',
		name: 'GitHub',
		brand: 'github',
		status: 'available',
		desc: '리포지토리·이슈·PR 자동화',
	},
	{
		id: 'openai',
		name: 'OpenAI',
		brand: 'openai',
		status: 'available',
		desc: 'GPT 모델 API 연동',
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
		id: 'google',
		name: 'Google Drive',
		brand: 'google',
		status: 'available',
		desc: '파일 업로드 및 폴더 감시',
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
]
