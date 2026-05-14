import { z } from 'zod'

export const loginSchema = z.object({
	email: z.email('이메일 주소를 다시 확인해주세요!'),
	password: z.string().min(8, '비밀번호는 8자 이상으로 입력해주세요!'),
})

export const signupSchema = loginSchema
	.extend({
		passwordConfirm: z.string().min(1, '비밀번호 확인 입력은 필수예요!'),
	})
	.refine(data => data.password === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: '비밀번호가 일치하지 않아요!',
	})

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
