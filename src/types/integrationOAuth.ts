import type { ApiResponse } from '@/types/api'

type OAuthAuthorizeData = Record<string, string> | string

export type OAuthAuthorizeResponse = ApiResponse<OAuthAuthorizeData>

/** Google 연결 때 받을 권한 묶음. 서버가 모르는 값이면 400 `INVALID_INPUT`이다. */
type GoogleScopeGroup = 'gmail' | 'sheets' | 'drive' | 'calendar'

/** `POST /api/v1/oauth/google/connect` body. 비어 있으면 400 `INVALID_INPUT`이다. */
export type GoogleConnectRequest = {
	scopeGroups: readonly GoogleScopeGroup[]
}
