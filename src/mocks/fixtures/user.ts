import type { CurrentUserResponse } from '@/types/user'

export const currentUserResponse = {
	success: true,
	data: {
		id: '550e8400-e29b-41d4-a716-446655440000',
		email: 'ieumsae@example.com',
		name: '이음새',
		provider: 'LOCAL',
		createdAt: '2026-01-01T00:00:00',
	},
	message: 'success',
	code: 'SUCCESS',
} satisfies CurrentUserResponse
