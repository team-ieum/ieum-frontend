import { useState, type FormEvent } from 'react'
import { emailSchema, verificationCodeSchema } from '@/schemas/auth'

import type { VerificationPurpose } from '@/types/auth'
export type VerificationStep = 'email' | 'code' | 'details'

export const useEmailVerification = (purpose: VerificationPurpose) => {
	const [step, setStep] = useState<VerificationStep>('email')
	const [email, setEmail] = useState('')
	const [code, setCode] = useState('')
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
	const changeEmail = (value: string) => {
		setEmail(value)
		setError('')
		setNotice('')
	}
	const changeCode = (value: string) => {
		setCode(value)
		setError('')
		setNotice('')
	}
	const submitEmail = (event: FormEvent) => {
		event.preventDefault()
		const parsed = emailSchema.safeParse(email)
		if (!parsed.success) {
			setError(parsed.error.issues[0].message)
			return
		}
		setEmail(parsed.data)
		setError('')
		setStep('code')
		setNotice('인증코드 발송 기능을 연결 중입니다. 아직 이메일이 발송되지 않습니다.')
	}
	const submitCode = (event: FormEvent) => {
		event.preventDefault()
		const parsed = verificationCodeSchema.safeParse(code)
		if (!parsed.success) {
			setError(parsed.error.issues[0].message)
			return
		}
		setNotice('인증코드 검증 기능을 연결 중입니다.')
	}
	const restart = () => {
		setStep('email')
		setCode('')
		setVerifiedEmail(null)
		setError('')
		setNotice('')
	}
	return { restart, purpose, step, email, code, error, notice, verifiedEmail, changeEmail, changeCode, submitEmail, submitCode }
}
