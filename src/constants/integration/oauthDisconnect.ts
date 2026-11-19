import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'

export const OAUTH_DISCONNECT_NOTICE = {
	GITHUB: '연결을 해제해도 GitHub 앱은 설치된 채로 남아요. GitHub 설정 > Applications에서 따로 삭제할 수 있어요.',
	NOTION: 'Notion에도 이음의 접근 권한을 취소해 달라고 요청해요.',
} as const satisfies Record<OAuthDisconnectProvider, string>

export const isOAuthDisconnectProvider = (provider: string): provider is OAuthDisconnectProvider =>
	Object.hasOwn(OAUTH_DISCONNECT_NOTICE, provider)
