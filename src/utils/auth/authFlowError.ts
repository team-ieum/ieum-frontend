import { isApiError } from '@/utils/ApiError'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import type { VerificationPurpose } from '@/types/auth'

type AuthAction = 'send' | 'verify' | 'signup' | 'reset'
export const AUTH_FLOW_ERROR_MESSAGES = {
	EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다. 로그인해주세요.',
	EMAIL_NOT_VERIFIED: '이메일 인증을 다시 진행해주세요.',
	VERIFICATION_RESEND_TOO_SOON: '잠시 후 다시 요청해주세요.',
	MAIL_SEND_FAILED: '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
	VERIFICATION_CODE_INVALID: '인증코드가 일치하지 않습니다.',
	VERIFICATION_ATTEMPTS_EXCEEDED: '입력 횟수를 초과했습니다. 인증코드를 다시 받아주세요.',
	VERIFICATION_CODE_EXPIRED: '인증코드가 만료되었습니다. 다시 받아주세요.',
} as const

export const getAuthFlowError = (error: unknown, action: AuthAction, purpose: VerificationPurpose): string => {
	if (isApiError(error)) {
		// 재설정에서는 예기치 않은 서버 오류 문구로도 가입 여부가 드러나지 않게 한다.
		if (error.code === 'EMAIL_ALREADY_EXISTS' && purpose === 'PASSWORD_RESET')
			return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
		if (error.code === 'INVALID_INPUT') {
			if (action === 'send') return '이메일 주소를 확인해주세요.'
			if (action === 'verify') return '인증코드는 6자리 숫자로 입력해주세요.'
			return action === 'signup' ? `이름과 비밀번호 입력값을 확인해주세요. ${PASSWORD_RULE_MESSAGE}` : PASSWORD_RULE_MESSAGE
		}
		if (error.code in AUTH_FLOW_ERROR_MESSAGES)
			return AUTH_FLOW_ERROR_MESSAGES[error.code as keyof typeof AUTH_FLOW_ERROR_MESSAGES]
	}
	if (action === 'send') return '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
	if (action === 'verify') return '인증코드를 확인하지 못했습니다. 다시 시도해주세요.'
	return action === 'signup'
		? '회원가입에 실패했습니다. 다시 시도해주세요.'
		: '비밀번호 재설정에 실패했습니다. 다시 시도해주세요.'
}
