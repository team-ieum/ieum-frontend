import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'

export const MAX_DISCONNECT_PREVIEW_WORKFLOWS = 3

export const OAUTH_DISCONNECT_AUTOMATIC_NOTICE = {
	SCHEDULE: '해제 후에도 예약된 시간마다 실행을 시도해요.',
	WEBHOOK: '해제 후에도 웹훅을 받을 때마다 실행을 시도해요.',
} as const

export const OAUTH_DISCONNECT_NOTICE = {
	GITHUB: 'GitHub 앱은 설치된 상태로 남아요.',
	NOTION: 'Notion에도 이음의 접근 권한을 취소해 달라고 요청해요.',
} as const satisfies Record<OAuthDisconnectProvider, string>

export const isOAuthDisconnectProvider = (provider: string): provider is OAuthDisconnectProvider =>
	Object.hasOwn(OAUTH_DISCONNECT_NOTICE, provider)
