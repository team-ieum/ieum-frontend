export interface RequestLoginDto {
	email: string
	password: string
}

export interface ResponseLoginDto {
	id: string
	email: string
	name: string
	createdAt: string
	updatedAt: string
}

export type AuthMode = 'login' | 'signup'

export type SwapDirection = 1 | -1
