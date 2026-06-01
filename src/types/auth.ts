import type { ApiResponse } from '@/types/api'

export type AuthErrorCode =
	| 'EMAIL_ALREADY_EXISTS'
	| 'SOCIAL_LOGIN_EMAIL_CONFLICT'
	| 'INVALID_CREDENTIALS'
	| 'TOKEN_EXPIRED'
	| 'TOKEN_INVALID'

export interface RequestRegisterDto {
	email: string
	password: string
	name: string
}

export interface ResponseRegisterDto {
	userId: string
	email: string
	name: string
}

export type RegisterResponse = ApiResponse<ResponseRegisterDto>

export interface RequestLoginDto {
	email: string
	password: string
}

export interface ResponseLoginDto {
	accessToken: string
	refreshToken: string
	expiresIn: number
}

export type LoginResponse = ApiResponse<ResponseLoginDto>

export type RefreshResponse = LoginResponse

export type AuthMode = 'login' | 'signup'

export type SwapDirection = 1 | -1
