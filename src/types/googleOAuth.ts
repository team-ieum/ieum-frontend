import type { ApiResponse } from '@/types/api'

export interface GoogleScopesData {
	scopes: Record<string, string[]>
}

export interface GoogleMyScopesData {
	scopes: string[]
	connected: boolean
}

export type GoogleScopesResponse = ApiResponse<GoogleScopesData>
export type GoogleMyScopesResponse = ApiResponse<GoogleMyScopesData>
