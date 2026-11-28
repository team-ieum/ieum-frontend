import type { ApiResponse } from '@/types/api'

type OAuthAuthorizeData = Record<string, string> | string

export type OAuthAuthorizeResponse = ApiResponse<OAuthAuthorizeData>

/** Google 연결 때 받을 권한 묶음. 서버가 모르는 값이면 400 `INVALID_INPUT`이다. */
type GoogleScopeGroup = 'gmail' | 'sheets' | 'drive' | 'calendar'

/** `POST /api/v1/oauth/google/connect` body. 비어 있으면 400 `INVALID_INPUT`이다. */
export type GoogleConnectRequest = {
	scopeGroups: readonly GoogleScopeGroup[]
}

type GithubAppInstallDto = {
	/** GitHub App 설치 화면 주소. 처음 설치와 레포 추가·변경이 같은 주소다. 설치 후 다시 연동할 필요는 없다. */
	installUrl: string
}

/** `GET /api/v1/github/oauth2/install` 응답. 로그인이 필요하다. */
export type GithubAppInstallResponse = ApiResponse<GithubAppInstallDto>
