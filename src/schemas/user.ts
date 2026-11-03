import { z } from 'zod'
import { passwordSchema } from '@/schemas/auth'

export const PROFILE_NAME_RULE_MESSAGE = '2~20자로 입력해 주세요.'

export const profileNameSchema = z.string().trim().min(2, PROFILE_NAME_RULE_MESSAGE).max(20, PROFILE_NAME_RULE_MESSAGE)

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
		newPassword: passwordSchema,
		newPasswordConfirm: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요.'),
	})
	.refine(data => data.newPassword !== data.currentPassword, {
		path: ['newPassword'],
		message: '현재 비밀번호와 다른 비밀번호를 입력해 주세요.',
	})
	.refine(data => data.newPassword === data.newPasswordConfirm, {
		path: ['newPasswordConfirm'],
		message: '새 비밀번호가 일치하지 않아요.',
	})

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
