import type { ApiResponse } from '@/types/api'

type OAuthAuthorizeData = Record<string, string> | string

export type OAuthAuthorizeResponse = ApiResponse<OAuthAuthorizeData>
