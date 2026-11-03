import type { ApiResponse } from '@/types/api'

export type UserAuthProvider = 'LOCAL' | 'GOOGLE'

export interface CurrentUser {
	id: string
	email: string
	name: string
	provider: UserAuthProvider
	createdAt: string
}

export type CurrentUserResponse = ApiResponse<CurrentUser>

export interface UpdateCurrentUserBody {
	name: string
}

export interface ChangePasswordBody {
	currentPassword: string
	newPassword: string
}
