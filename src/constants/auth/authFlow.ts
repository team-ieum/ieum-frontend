export const EMAIL_VERIFICATION_POLICY = {
	codeLifetimeSeconds: 5 * 60,
	verifiedLifetimeSeconds: 10 * 60,
	resendCooldownSeconds: 30,
} as const

export const AUTH_VERIFICATION_SUBMIT_LABELS = {
	email: '인증코드 받기',
	code: '인증코드 확인',
} as const

export const AUTH_FLOW_ERROR_MESSAGES = {
	EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다. 로그인해주세요.',
	EMAIL_NOT_VERIFIED: '이메일 인증을 다시 진행해주세요.',
	VERIFICATION_RESEND_TOO_SOON: '잠시 후 다시 요청해주세요.',
	MAIL_SEND_FAILED: '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
	VERIFICATION_CODE_INVALID: '인증코드가 일치하지 않습니다.',
	VERIFICATION_ATTEMPTS_EXCEEDED: '입력 횟수를 초과했습니다. 인증코드를 다시 받아주세요.',
	VERIFICATION_CODE_EXPIRED: '인증코드가 만료되었습니다. 다시 받아주세요.',
} as const

export const AUTH_VERIFICATION_MESSAGES = {
	codeSent: '입력하신 이메일로 인증코드를 보냈습니다. 메일이 오지 않으면 이메일 주소를 확인해주세요.',
	verificationExpired: '이메일 인증 유효시간이 만료되었습니다. 이메일 인증을 다시 진행해주세요.',
} as const
