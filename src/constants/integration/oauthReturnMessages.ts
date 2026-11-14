/** 연동 화면 OAuth 복귀를 인식하는 공급자. 콜백 경로·쿼리 판별이 이 목록을 따른다. */
export const INTEGRATION_OAUTH_PROVIDERS = ['github', 'notion', 'slack'] as const

export type IntegrationOAuthProvider = (typeof INTEGRATION_OAUTH_PROVIDERS)[number]

export const OAUTH_SUCCESS_MESSAGES: Record<IntegrationOAuthProvider, string> = {
	github: 'GitHub 계정이 연결되었습니다.',
	notion: 'Notion 계정이 연결되었습니다.',
	slack: 'Slack 워크스페이스가 연결되었습니다.',
}

/** 서버가 `error`에 붙이는 공급자별 오류 코드의 안내 문구. 코드는 `{provider}_` 접두어로 시작한다. */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
	slack_state_expired: '5분이 지났거나 이미 쓴 요청이에요. 다시 시도해 주세요.',
	slack_state_mismatch: '설치를 시작한 브라우저에서 다시 시도해 주세요.',
	slack_denied: '설치를 취소했어요.',
	slack_exchange: 'Slack 연결에 실패했어요. 다시 시도해 주세요.',
	slack_org_install: 'Enterprise 조직 단위 설치는 지원하지 않아요.',
	slack_other_team: '다른 워크스페이스가 이미 연결돼 있어요. 먼저 연결을 해제해 주세요.',
}

/** 매핑에 없는 `{provider}_*` 오류 코드의 공급자 공통 문구. 없는 공급자는 오류 코드를 그대로 보여 준다. */
export const OAUTH_FALLBACK_ERROR_MESSAGES: Partial<Record<IntegrationOAuthProvider, string>> = {
	slack: 'Slack 연결에 실패했어요. 다시 시도해 주세요.',
}
