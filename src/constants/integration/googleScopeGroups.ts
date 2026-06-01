import type { IntegrationBrand } from '@/types/integration'

export const GOOGLE_OAUTH_CONNECTED_ID = 'google-oauth'

export const GOOGLE_SCOPE_BRANDS: IntegrationBrand[] = ['google', 'gmail', 'sheets']

type GoogleScopeGroupMeta = {
	name: string
	brand: IntegrationBrand
	desc: string
}

export const GOOGLE_SCOPE_GROUP_META: Record<string, GoogleScopeGroupMeta> = {
	GMAIL: { name: 'Gmail', brand: 'gmail', desc: '이메일 발송 및 수신 트리거' },
	SHEETS: { name: 'Google Sheets', brand: 'sheets', desc: '스프레드시트 읽기 / 쓰기' },
	DRIVE: { name: 'Google Drive', brand: 'google', desc: '파일 업로드 및 폴더 감시' },
	CALENDAR: { name: 'Google Calendar', brand: 'google', desc: '일정 조회 및 이벤트 관리' },
}
