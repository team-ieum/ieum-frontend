import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'

export const OAUTH_DISCONNECT_NOTICE = {
	GITHUB: 'GitHub App 설치는 별도로 남습니다. 설치까지 제거하려면 GitHub 설정 > Applications에서 직접 제거해 주세요.',
	NOTION: '이음에서 연결을 해제하고 Notion에도 권한 폐기를 요청합니다.',
} as const satisfies Record<OAuthDisconnectProvider, string>

export const isOAuthDisconnectProvider = (provider: string): provider is OAuthDisconnectProvider =>
	Object.hasOwn(OAUTH_DISCONNECT_NOTICE, provider)
