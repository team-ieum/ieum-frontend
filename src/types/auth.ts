import type { ApiResponse } from '@/types/api'

export type AuthErrorCode =
	| 'EMAIL_ALREADY_EXISTS'
	| 'SOCIAL_LOGIN_EMAIL_CONFLICT'
	| 'INVALID_CREDENTIALS'
	| 'TOKEN_EXPIRED'
	| 'TOKEN_INVALID'
	| 'EMAIL_NOT_VERIFIED'
	| 'VERIFICATION_RESEND_TOO_SOON'
	| 'MAIL_SEND_FAILED'
	| 'VERIFICATION_CODE_INVALID'
	| 'VERIFICATION_ATTEMPTS_EXCEEDED'
	| 'VERIFICATION_CODE_EXPIRED'

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

export type AuthMode = 'login' | 'signup' | 'forgotPassword'

export type SwapDirection = 1 | -1

export type VerificationPurpose = 'SIGNUP' | 'PASSWORD_RESET'
export type AuthActionResponse = Pick<ApiResponse<never>, 'success' | 'message' | 'code'>
export type SendEmailCodeRequest = { email: string; purpose: VerificationPurpose }
export type VerifyEmailCodeRequest = SendEmailCodeRequest & { code: string }
export type ResetPasswordRequest = { email: string; newPassword: string }
