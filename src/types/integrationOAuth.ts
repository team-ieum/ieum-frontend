import type { ApiResponse } from '@/types/api'
import type { GoogleOAuthScopeGroup } from '@/constants/integration/googleOAuth'

type OAuthAuthorizeData = Record<string, string> | string

export type OAuthAuthorizeResponse = ApiResponse<OAuthAuthorizeData>

export type GoogleOAuthConnectRequest = { scopeGroups: GoogleOAuthScopeGroup[] }

export type GoogleOAuthConnectResponse = ApiResponse<{ authorizationUrl: string }>
