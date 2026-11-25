import type { OAuthDisconnectProvider } from '@/types/oauthDisconnect'
import type { IntegrationBrand } from '@/types/integration'
import type { GoogleConnectRequest } from '@/types/integrationOAuth'
import type { WebhookCredentialProvider } from '@/types/webhookCredentials'

export const WEBHOOK_PROVIDER_BRAND: Record<WebhookCredentialProvider, IntegrationBrand> = {
	SLACK: 'slack',
	DISCORD: 'discord',
}

/** 웹훅 자격증명이 있으면 연결 가능 카탈로그에서 제외할 서비스 id */
export const WEBHOOK_PROVIDER_CATALOG_ID: Record<WebhookCredentialProvider, string> = {
	SLACK: 'slack',
	DISCORD: 'discord',
}

export const OAUTH_PROVIDER_BRAND: Record<string, IntegrationBrand> = {
	GOOGLE: 'google',
	GITHUB: 'github',
	NOTION: 'notion',
	SLACK: 'slack',
	DISCORD: 'discord',
}

/**
 * OAuth 연결 시 연결 가능 카탈로그에서 제외할 서비스 id.
 * 같은 브랜드라도 연결 방식(봇·웹훅)마다 카탈로그 항목이 따로 있어 브랜드가 아니라 id로 제외한다.
 */
export const OAUTH_PROVIDER_EXCLUDED_CATALOG_IDS: Record<string, string[]> = {
	GOOGLE: ['google', 'gmail', 'sheets', 'google-calendar'],
	GITHUB: ['github'],
	NOTION: ['notion'],
	SLACK: ['slack-bot'],
	// 서버마다 연결이 따로 생겨 연결한 뒤에도 다른 서버를 더 연결할 수 있게 타일을 남긴다.
	DISCORD: [],
}

/** 연결 방식 배지를 '봇'으로 표시할 OAuth 공급자 */
export const OAUTH_BOT_PROVIDERS: readonly string[] = ['SLACK', 'DISCORD']

type OAuthAuthorizeGetRequest = {
	method?: 'get'
	path: string
	/** nonce 쿠키를 주고받아야 하는 공급자만 켠다. 쿠키가 실리지 않으면 콜백이 state 불일치로 실패한다. */
	withCredentials?: boolean
}

/** 받을 권한을 body로 보내고 일회용 link_token이 담긴 인가 URL을 받는 공급자(Google) */
type OAuthAuthorizePostRequest = {
	method: 'post'
	path: string
	body: GoogleConnectRequest
}

export type OAuthAuthorizeRequest = OAuthAuthorizeGetRequest | OAuthAuthorizePostRequest

export const OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID = {
	github: { path: '/api/v1/github/oauth2/authorize' },
	notion: { path: '/api/v1/notion/oauth2/authorize' },
	'slack-bot': { path: '/api/v1/slack/oauth2/authorize', withCredentials: true },
	'discord-bot': { path: '/api/v1/discord/oauth2/authorize', withCredentials: true },
	'google-calendar': {
		method: 'post',
		path: '/api/v1/oauth/google/connect',
		body: { scopeGroups: ['calendar'] },
	},
} as const satisfies Record<string, OAuthAuthorizeRequest>

export type OAuthConnectServiceId = keyof typeof OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID

export const isOAuthConnectServiceId = (serviceId: string): serviceId is OAuthConnectServiceId =>
	serviceId in OAUTH_AUTHORIZE_REQUEST_BY_SERVICE_ID

/**
 * 연결된 서비스 상세에서 '다시 연결'할 때 쓸 연결 요청(카탈로그 서비스 id).
 * 여기 없는 공급자는 다시 연결 버튼을 보여 주지 않는다.
 */
export const OAUTH_RECONNECT_SERVICE_ID_BY_PROVIDER: Partial<Record<string, OAuthConnectServiceId>> = {
	GOOGLE: 'google-calendar',
	NOTION: 'notion',
	GITHUB: 'github',
}

type OAuthDisconnectConfig = {
	/**
	 * 해제 경로. 연결 하나만 두는 공급자는 계정 ID를 쓰지 않는다.
	 * @throws 계정 ID가 필요한 공급자(Discord)인데 비었으면 Error. 빈 ID로 다른 경로를 부르지 않게 요청 전에 막는다.
	 */
	getPath: (providerAccountId?: string) => string
	/** 공용 해제 API의 ACCOUNT_NOT_CONNECTED 응답도 해제 완료로 취급한다. */
	canIgnoreMissingConnection?: boolean
	/** 해제 확인 창에 덧붙일 공급자별 안내 */
	notice?: string
	/** 해제 확인 전에 이 연결을 쓰는 워크플로우를 조회해 확인 창에 보여 줄지 */
	listsAffectedWorkflows?: boolean
	/** 워크플로우별 영향을 표시하는 전용 확인창의 공급자 */
	previewProvider?: OAuthDisconnectProvider
}

/**
 * 연동 화면에서 해제할 수 있는 OAuth 공급자.
 * 공용 `DELETE /api/v1/oauth/connections/{provider}`는 SLACK이면 400이라 Slack은 공급자별 경로를 쓴다.
 * Discord는 서버마다 연결이 있어 서버 ID(`providerAccountId`)로 하나씩 해제한다(공용 해제 API 아님).
 */
export const OAUTH_DISCONNECT_BY_PROVIDER: Record<string, OAuthDisconnectConfig> = {
	SLACK: {
		getPath: () => '/api/v1/slack/oauth2/connection',
		notice: '다시 연결하면 비공개 채널에는 봇을 다시 초대해야 해요.',
	},
	NOTION: { getPath: () => '/api/v1/oauth/connections/NOTION', canIgnoreMissingConnection: true, previewProvider: 'NOTION' },
	GITHUB: { getPath: () => '/api/v1/oauth/connections/GITHUB', canIgnoreMissingConnection: true, previewProvider: 'GITHUB' },
	GOOGLE: {
		getPath: () => '/api/v1/oauth/connections/GOOGLE',
		canIgnoreMissingConnection: true,
		notice: '다시 연결하면 Google 권한 동의를 다시 받아야 해요.',
		listsAffectedWorkflows: true,
	},
	DISCORD: {
		getPath: guildId => {
			if (!guildId) throw new Error('해제할 Discord 서버 ID가 없습니다.')
			return `/api/v1/discord/oauth2/connections/${encodeURIComponent(guildId)}`
		},
	},
}

export const getOAuthDisconnectConfig = (provider?: string): OAuthDisconnectConfig | undefined => {
	const key = provider?.toUpperCase()
	return key && Object.hasOwn(OAUTH_DISCONNECT_BY_PROVIDER, key) ? OAUTH_DISCONNECT_BY_PROVIDER[key] : undefined
}
