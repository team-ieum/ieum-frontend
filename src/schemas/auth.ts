import { z } from 'zod'

export const loginSchema = z.object({
	email: z.email('이메일 형식이 올바르지 않습니다.'),
	password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

export const signupSchema = loginSchema
	.extend({
		passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
	})
	.refine(data => data.password === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: '비밀번호가 일치하지 않습니다.',
	})

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
