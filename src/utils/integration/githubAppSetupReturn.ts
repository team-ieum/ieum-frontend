import { GITHUB_APP_SETUP_RETURN_MESSAGES } from '@/constants/integration/oauthReturnMessages'

// GitHub App Setup URL이 연동 화면이라 설치·레포 변경 뒤 이 쿼리를 붙여 돌아온다.
// 값은 신뢰하지 않고 안내와 목록 재조회에만 쓴다(명세).
const GITHUB_APP_SETUP_QUERY_KEYS = ['installation_id', 'setup_action'] as const

export const isGithubAppSetupReturnSearchParams = (searchParams: URLSearchParams): boolean =>
	GITHUB_APP_SETUP_QUERY_KEYS.some(key => searchParams.has(key))

export const removeGithubAppSetupReturnSearchParams = (searchParams: URLSearchParams): URLSearchParams => {
	const nextSearchParams = new URLSearchParams(searchParams)
	GITHUB_APP_SETUP_QUERY_KEYS.forEach(key => nextSearchParams.delete(key))
	return nextSearchParams
}

// URL에서 온 값이라 `constructor` 같은 상속 키가 문구로 잡히지 않게 자기 키만 인정한다.
const isKnownSetupAction = (action: string): action is keyof typeof GITHUB_APP_SETUP_RETURN_MESSAGES =>
	Object.hasOwn(GITHUB_APP_SETUP_RETURN_MESSAGES, action)

/** `setup_action`에 맞는 복귀 안내. 값이 없거나 모르는 값이면 설치 완료로 안내한다. */
export const getGithubAppSetupReturnMessage = (searchParams: URLSearchParams): { title: string; message: string } => {
	const action = searchParams.get('setup_action')
	return action && isKnownSetupAction(action)
		? GITHUB_APP_SETUP_RETURN_MESSAGES[action]
		: GITHUB_APP_SETUP_RETURN_MESSAGES.install
}
