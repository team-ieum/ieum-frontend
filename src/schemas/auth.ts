import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('이메일 주소를 다시 확인해주세요!'))

export const PASSWORD_RULE_MESSAGE =
	'비밀번호는 8~72자이며 영문 대문자·소문자·숫자·특수문자를 각각 포함해야 합니다. 한글은 사용할 수 없습니다.'

export const verificationCodeSchema = z.string().regex(/^[0-9]{6}$/, '인증코드는 6자리 숫자로 입력해주세요.')

export const passwordSchema = z
	.string()
	.min(8, PASSWORD_RULE_MESSAGE)
	.max(72, PASSWORD_RULE_MESSAGE)
	.regex(/[A-Z]/, PASSWORD_RULE_MESSAGE)
	.regex(/[a-z]/, PASSWORD_RULE_MESSAGE)
	.regex(/[0-9]/, PASSWORD_RULE_MESSAGE)
	.regex(/[^A-Za-z0-9\s]/, PASSWORD_RULE_MESSAGE)
	.regex(/^[^\p{Script=Hangul}]*$/u, PASSWORD_RULE_MESSAGE)

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(8, '비밀번호는 8자 이상으로 입력해주세요!'),
})

export const forgotPasswordSchema = z.object({
	email: emailSchema,
})

export const signupSchema = loginSchema
	.extend({
		password: passwordSchema,
		name: z.string().trim().min(1, '이름을 입력해주세요!'),
		passwordConfirm: z.string().min(1, '비밀번호 확인 입력은 필수예요!'),
	})
	.refine(data => data.password === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: '비밀번호가 일치하지 않아요!',
	})

export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
	.object({
		newPassword: passwordSchema,
		passwordConfirm: z.string().min(1, '비밀번호 확인 입력은 필수예요!'),
	})
	.refine(data => data.newPassword === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: '비밀번호가 일치하지 않아요!',
	})
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
