/** 연동 화면 OAuth 복귀를 인식하는 공급자. 콜백 경로·쿼리 판별이 이 목록을 따른다. */
export const INTEGRATION_OAUTH_PROVIDERS = ['github', 'notion', 'slack', 'discord', 'google'] as const

export type IntegrationOAuthProvider = (typeof INTEGRATION_OAUTH_PROVIDERS)[number]

export const OAUTH_SUCCESS_MESSAGES: Record<IntegrationOAuthProvider, string> = {
	github: 'GitHub 계정이 연결되었습니다.',
	notion: 'Notion 계정이 연결되었습니다.',
	slack: 'Slack 워크스페이스가 연결되었습니다.',
	discord: 'Discord 서버가 연결되었습니다.',
	google: 'Google 계정이 연결되었습니다.',
}

/** 서버가 `error`에 붙이는 공급자별 오류 코드의 안내 문구. 코드는 `{provider}_` 접두어로 시작한다. */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
	slack_state_expired: '5분이 지났거나 이미 쓴 요청이에요. 다시 시도해 주세요.',
	slack_state_mismatch: '설치를 시작한 브라우저에서 다시 시도해 주세요.',
	slack_denied: '설치를 취소했어요.',
	slack_exchange: 'Slack 연결에 실패했어요. 다시 시도해 주세요.',
	slack_org_install: 'Enterprise 조직 단위 설치는 지원하지 않아요.',
	slack_other_team: '다른 워크스페이스가 이미 연결돼 있어요. 먼저 연결을 해제해 주세요.',
	discord_state_expired: '5분이 지났거나 이미 쓴 요청이에요. 다시 시도해 주세요.',
	discord_state_mismatch: '연결을 시작한 브라우저에서 다시 시도해 주세요.',
	discord_denied: '봇 추가를 취소했어요.',
	discord_exchange: 'Discord 연결에 실패했어요. 다시 시도해 주세요.',
}

/** 매핑에 없는 `{provider}_*` 오류 코드의 공급자 공통 문구. 없는 공급자는 오류 코드를 그대로 보여 준다. */
export const OAUTH_FALLBACK_ERROR_MESSAGES: Partial<Record<IntegrationOAuthProvider, string>> = {
	slack: 'Slack 연결에 실패했어요. 다시 시도해 주세요.',
	discord: 'Discord 연결에 실패했어요. 다시 시도해 주세요.',
	google: 'Google 연결에 실패했어요. 다시 시도해 주세요.',
}

/** GitHub App 설치 화면이 연동 화면으로 돌려보낼 때 붙이는 `setup_action` 값. */
type GithubAppSetupAction = 'install' | 'update' | 'request'

/** `setup_action`별 복귀 안내. 모르는 값이면 `install` 문구를 쓴다. */
export const GITHUB_APP_SETUP_RETURN_MESSAGES: Record<GithubAppSetupAction, { title: string; message: string }> = {
	install: {
		title: 'GitHub 앱 설치 완료',
		message: 'GitHub 앱을 설치했어요. 노드 설정에서 레포 목록을 다시 불러오면 추가한 레포를 고를 수 있어요.',
	},
	update: {
		title: '레포 범위 변경 완료',
		message: 'GitHub 앱의 레포 범위를 바꿨어요. 노드 설정에서 레포 목록을 다시 불러와 주세요.',
	},
	request: {
		title: '설치 승인 요청',
		message: '조직 관리자에게 GitHub 앱 설치 승인을 요청했어요. 승인되면 레포를 고를 수 있어요.',
	},
}
