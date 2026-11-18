import type { IntegrationBrand } from '@/types/integration'
import type { WebhookCredentialProvider } from '@/types/webhookCredentials'

export const WEBHOOK_PROVIDER_BRAND: Record<WebhookCredentialProvider, IntegrationBrand> = {
	SLACK: 'slack',
	DISCORD: 'discord',
}

/** 웹훅 자격증명이 있으면 연결 가능 카탈로그에서 제외할 서비스 id */
export const WEBHOOK_PROVIDER_CATALOG_ID: Record<WebhookCredentialProvider, string> = {
	SLACK: 'slack-webhook',
	DISCORD: 'discord',
}

export const OAUTH_PROVIDER_BRAND: Record<string, IntegrationBrand> = {
	GOOGLE: 'google',
	GITHUB: 'github',
	NOTION: 'notion',
	SLACK: 'slack',
}

/**
 * OAuth 연결 시 연결 가능 카탈로그에서 제외할 서비스 id.
 * 같은 브랜드라도 연결 방식(봇·웹훅)마다 카탈로그 항목이 따로 있어 브랜드가 아니라 id로 제외한다.
 */
export const OAUTH_PROVIDER_EXCLUDED_CATALOG_IDS: Record<string, string[]> = {
	GOOGLE: ['google', 'gmail', 'sheets'],
	GITHUB: ['github'],
	NOTION: ['notion'],
	SLACK: ['slack'],
}

/** 연결 방식 배지를 '봇'으로 표시할 OAuth 공급자 */
export const OAUTH_BOT_PROVIDERS: readonly string[] = ['SLACK']

type OAuthAuthorizeRequest = {
	path: string
	/** nonce 쿠키를 주고받아야 하는 공급자만 켠다. 쿠키가 실리지 않으면 콜백이 state 불일치로 실패한다. */
	withCredentials?: boolean
}

export const OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID = {
	github: { path: '/api/v1/github/oauth2/authorize' },
	notion: { path: '/api/v1/notion/oauth2/authorize' },
	slack: { path: '/api/v1/slack/oauth2/authorize', withCredentials: true },
} as const satisfies Record<string, OAuthAuthorizeRequest>

export type OAuthConnectServiceId = keyof typeof OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID

export const isOAuthConnectServiceId = (serviceId: string): serviceId is OAuthConnectServiceId =>
	serviceId in OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID

const COMMON_OAUTH_DISCONNECT_PROVIDERS = ['GOOGLE', 'NOTION', 'GITHUB'] as const

export type CommonOAuthDisconnectProvider = (typeof COMMON_OAUTH_DISCONNECT_PROVIDERS)[number]

export const isCommonOAuthDisconnectProvider = (provider: string): provider is CommonOAuthDisconnectProvider =>
	COMMON_OAUTH_DISCONNECT_PROVIDERS.some(candidate => candidate === provider)

export const OAUTH_DISCONNECT_NOTICE: Record<CommonOAuthDisconnectProvider, string> = {
	GOOGLE: 'Google로 로그인하는 계정은 해제 후에도 로그인할 수 있습니다. 다음 Google 로그인 때 이메일·프로필 기본 연결이 다시 생길 수 있으며, Gmail·Drive 등 추가 권한은 다시 동의해야 합니다.',
	GITHUB: 'GitHub App 설치는 별도로 남습니다. 설치까지 제거하려면 GitHub 설정 > Applications에서 직접 제거해 주세요.',
	NOTION: '이음에서 연결을 해제하고 Notion에도 권한 폐기를 요청합니다.',
}

type OAuthDisconnectConfig = {
	path: string
	/** 해제 확인 창에 덧붙일 공급자별 안내 */
	notice?: string
}

/**
 * 연동 화면에서 해제할 수 있는 OAuth 공급자.
 * 공용 `DELETE /api/v1/oauth/connections/{provider}`는 SLACK이면 400이라 공급자별 경로를 쓴다.
 */
export const OAUTH_DISCONNECT_BY_PROVIDER: Record<string, OAuthDisconnectConfig> = {
	SLACK: {
		path: '/api/v1/slack/oauth2/connection',
		notice: '다시 연결하면 비공개 채널에는 봇을 다시 초대해야 해요.',
	},
}
