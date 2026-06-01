import type { ApiResponse } from '@/types/api'

export type OAuthAuthorizeData = Record<string, string> | string

export type OAuthAuthorizeResponse = ApiResponse<OAuthAuthorizeData>
