import { useEffect, useRef, useState, type FormEvent } from 'react'
import { emailSchema, verificationCodeSchema } from '@/schemas/auth'
import type { VerificationPurpose } from '@/types/auth'
import { useSendEmailCodeMutation } from '@/hooks/auth/mutations/useSendEmailCodeMutation'
import { useVerifyEmailCodeMutation } from '@/hooks/auth/mutations/useVerifyEmailCodeMutation'
import { useAuthClock } from '@/hooks/auth/useAuthClock'
import { isApiError } from '@/utils/ApiError'

export type VerificationStep = 'email' | 'code' | 'details'

export const useEmailVerification = (purpose: VerificationPurpose) => {
	const [step, setStep] = useState<VerificationStep>('email')
	const [email, setEmail] = useState('')
	const [code, setCode] = useState('')
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const [cooldown, setCooldown] = useState({ email: '', until: 0 })
	const now = useAuthClock(cooldown.until > 0)
	const resendSeconds =
		cooldown.email === email.trim().toLowerCase() ? Math.max(0, Math.ceil((cooldown.until - now) / 1000)) : 0
	const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
	const sendMutation = useSendEmailCodeMutation()
	const verifyMutation = useVerifyEmailCodeMutation()
	const requestId = useRef(0)
	const busy = useRef(false)
	const mounted = useRef(true)
	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
			requestId.current += 1
		}
	}, [])
	const isPending = sendMutation.isPending || verifyMutation.isPending
	const changeEmail = (value: string) => {
		if (busy.current) return
		setEmail(value)
		setError('')
		setNotice('')
	}
	const changeCode = (value: string) => {
		if (busy.current) return
		setCode(value)
		setError('')
	}
	const restart = (message = '') => {
		requestId.current += 1
		busy.current = false
		setStep('email')
		setCode('')
		setVerifiedEmail(null)
		setError(message)
		setNotice('')
	}
	const sendCode = async () => {
		if (busy.current) return
		const parsed = emailSchema.safeParse(email)
		if (!parsed.success) {
			setError(parsed.error.issues[0].message)
			return
		}
		if (cooldown.email === parsed.data && Date.now() < cooldown.until) {
			setError('잠시 후 다시 요청해주세요.')
			return
		}
		const id = ++requestId.current
		busy.current = true
		setEmail(parsed.data)
		setError('')
		setNotice('')
		try {
			await sendMutation.mutateAsync({ email: parsed.data, purpose })
			if (!mounted.current || id !== requestId.current) return
			setCooldown({ email: parsed.data, until: Date.now() + 30_000 })
			setCode('')
			setVerifiedEmail(null)
			setStep('code')
			setNotice('입력하신 이메일로 인증코드를 보냈습니다. 메일이 오지 않으면 이메일 주소를 확인해주세요.')
		} catch (error) {
			if (mounted.current && id === requestId.current) {
				if (isApiError(error) && error.code === 'VERIFICATION_RESEND_TOO_SOON')
					setCooldown({ email: parsed.data, until: Date.now() + 30_000 })
				setError(isApiError(error) ? error.message : '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
			}
		} finally {
			if (id === requestId.current) busy.current = false
		}
	}
	const submitEmail = (event: FormEvent) => {
		event.preventDefault()
		void sendCode()
	}
	const submitCode = async (event: FormEvent) => {
		event.preventDefault()
		if (busy.current || step !== 'code') return
		const parsed = verificationCodeSchema.safeParse(code)
		if (!parsed.success) {
			setError(parsed.error.issues[0].message)
			return
		}
		const id = ++requestId.current
		busy.current = true
		setError('')
		setNotice('')
		try {
			await verifyMutation.mutateAsync({ email, code: parsed.data, purpose })
			if (!mounted.current || id !== requestId.current) return
			setVerifiedEmail(email)
			setCode('')
			setStep('details')
		} catch (error) {
			if (mounted.current && id === requestId.current)
				setError(isApiError(error) ? error.message : '인증코드를 확인하지 못했습니다. 다시 시도해주세요.')
		} finally {
			if (id === requestId.current) busy.current = false
		}
	}
	return {
		resendCode: sendCode,
		resendSeconds,
		restart,
		purpose,
		step,
		email,
		code,
		error,
		notice,
		verifiedEmail,
		isPending,
		changeEmail,
		changeCode,
		submitEmail,
		submitCode,
	}
}
