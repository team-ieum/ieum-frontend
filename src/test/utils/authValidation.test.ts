import { describe, expect, it } from 'vitest'
import { emailSchema, passwordSchema, verificationCodeSchema } from '@/schemas/auth'
import { ApiError } from '@/utils/ApiError'
import { getAuthFlowError } from '@/utils/auth/authFlowError'

describe('인증 입력 정책', () => {
	it('이메일 공백과 대소문자를 정규화한다', () => expect(emailSchema.parse(' User@Example.COM ')).toBe('user@example.com'))
	it('코드 앞자리 0을 문자열로 보존한다', () => expect(verificationCodeSchema.parse('048291')).toBe('048291'))
	it.each(['12345', '1234567', 'abcdef', '123 45'])('잘못된 인증코드 %s를 거부한다', code =>
		expect(verificationCodeSchema.safeParse(code).success).toBe(false)
	)
	it.each(['Ab1!', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh!', 'Abcdefgh1', 'Ab1!' + 'a'.repeat(97)])(
		'비밀번호 규칙을 만족하지 않는 %s를 거부한다',
		password => expect(passwordSchema.safeParse(password).success).toBe(false)
	)
	it('8자와 100자 비밀번호를 허용한다', () => {
		expect(passwordSchema.safeParse('Abcdef1!').success).toBe(true)
		expect(passwordSchema.safeParse('Ab1!' + 'a'.repeat(96)).success).toBe(true)
	})
	it('재설정 오류에서는 예상 밖 서버 문구나 가입 여부를 표시하지 않는다', () => {
		expect(getAuthFlowError(new ApiError('EMAIL_ALREADY_EXISTS', '가입된 사용자'), 'send', 'PASSWORD_RESET')).not.toContain(
			'가입'
		)
		expect(
			getAuthFlowError(new ApiError('INTERNAL_SERVER_ERROR', 'Google 가입 계정'), 'send', 'PASSWORD_RESET')
		).not.toContain('Google')
	})
})
