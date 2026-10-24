import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AUTH_FLOW_ERROR_MESSAGES, AUTH_VERIFICATION_MESSAGES, EMAIL_VERIFICATION_POLICY } from '@/constants/auth/authFlow'
import { emailSchema, verificationCodeSchema } from '@/schemas/auth'
import type { VerificationPurpose } from '@/types/auth'
import type { EmailVerificationController, VerificationStep } from '@/types/authFlow'
import { useSendEmailCodeMutation } from '@/hooks/auth/mutations/useSendEmailCodeMutation'
import { useVerifyEmailCodeMutation } from '@/hooks/auth/mutations/useVerifyEmailCodeMutation'
import { useAuthClock } from '@/hooks/auth/useAuthClock'
import { isApiError } from '@/utils/ApiError'
import { getAuthFlowError } from '@/utils/auth/authFlowError'

export const useEmailVerification = (purpose: VerificationPurpose): EmailVerificationController => {
	const [step, setStep] = useState<VerificationStep>('email')
	const [email, setEmail] = useState('')
	const [code, setCode] = useState('')
	const [error, setError] = useState('')
	const [notice, setNotice] = useState('')
	const [codeExpiresAt, setCodeExpiresAt] = useState(0)
	const [verifiedUntil, setVerifiedUntil] = useState(0)
	const [codeUnavailable, setCodeUnavailable] = useState(false)
	const [cooldown, setCooldown] = useState({ email: '', until: 0 })
	const now = useAuthClock(cooldown.until > 0 || codeExpiresAt > 0 || verifiedUntil > 0)
	const resendSeconds =
		cooldown.email === email.trim().toLowerCase()
			? Math.min(EMAIL_VERIFICATION_POLICY.resendCooldownSeconds, Math.max(0, Math.ceil((cooldown.until - now) / 1000)))
			: 0
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

	const restart = useCallback((message = '') => {
		requestId.current += 1
		busy.current = false
		setCodeExpiresAt(0)
		setVerifiedUntil(0)
		setCodeUnavailable(false)
		setStep('email')
		setCode('')
		setVerifiedEmail(null)
		setError(message)
		setNotice('')
	}, [])

	const isVerified = () => Boolean(verifiedEmail && verifiedEmail === email && step === 'details' && Date.now() < verifiedUntil)

	useEffect(() => {
		const deadline = step === 'code' ? codeExpiresAt : step === 'details' ? verifiedUntil : 0
		if (!deadline) return
		const check = () => {
			if (Date.now() < deadline) return
			if (step === 'details') restart(AUTH_VERIFICATION_MESSAGES.verificationExpired)
			else {
				setCodeUnavailable(true)
				setCode('')
				setError(AUTH_FLOW_ERROR_MESSAGES.VERIFICATION_CODE_EXPIRED)
				setNotice('')
				setCodeExpiresAt(0)
			}
		}
		const timer = window.setTimeout(check, Math.max(0, deadline - Date.now()))
		document.addEventListener('visibilitychange', check)
		return () => {
			window.clearTimeout(timer)
			document.removeEventListener('visibilitychange', check)
		}
	}, [step, codeExpiresAt, verifiedUntil, restart])

	const sendCode = async () => {
		if (busy.current) return
		const parsed = emailSchema.safeParse(email)
		if (!parsed.success) {
			setError(parsed.error.issues[0].message)
			return
		}
		if (cooldown.email === parsed.data && Date.now() < cooldown.until) {
			setError(AUTH_FLOW_ERROR_MESSAGES.VERIFICATION_RESEND_TOO_SOON)
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
			setCooldown({ email: parsed.data, until: Date.now() + EMAIL_VERIFICATION_POLICY.resendCooldownSeconds * 1000 })
			setCodeExpiresAt(Date.now() + EMAIL_VERIFICATION_POLICY.codeLifetimeSeconds * 1000)
			setVerifiedUntil(0)
			setCodeUnavailable(false)
			setCode('')
			setVerifiedEmail(null)
			setStep('code')
			setNotice(AUTH_VERIFICATION_MESSAGES.codeSent)
		} catch (error) {
			if (mounted.current && id === requestId.current) {
				if (isApiError(error) && error.code === 'VERIFICATION_RESEND_TOO_SOON')
					setCooldown({
						email: parsed.data,
						until: Date.now() + EMAIL_VERIFICATION_POLICY.resendCooldownSeconds * 1000,
					})
				setError(getAuthFlowError(error, 'send', purpose))
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
		if (codeUnavailable || Date.now() >= codeExpiresAt) {
			setCodeUnavailable(true)
			setCode('')
			setError(AUTH_FLOW_ERROR_MESSAGES.VERIFICATION_CODE_EXPIRED)
			return
		}
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
			setVerifiedUntil(Date.now() + EMAIL_VERIFICATION_POLICY.verifiedLifetimeSeconds * 1000)
			setCodeExpiresAt(0)
			setCodeUnavailable(false)
			setError('')
			setVerifiedEmail(email)
			setCode('')
			setStep('details')
		} catch (error) {
			if (mounted.current && id === requestId.current) {
				if (
					isApiError(error) &&
					(error.code === 'VERIFICATION_ATTEMPTS_EXCEEDED' || error.code === 'VERIFICATION_CODE_EXPIRED')
				) {
					setCodeUnavailable(true)
					setCode('')
					setCodeExpiresAt(0)
				}
				setError(getAuthFlowError(error, 'verify', purpose))
			}
		} finally {
			if (id === requestId.current) busy.current = false
		}
	}

	return {
		isVerified,
		codeUnavailable,
		codeSeconds: Math.min(
			EMAIL_VERIFICATION_POLICY.codeLifetimeSeconds,
			Math.max(0, Math.ceil((codeExpiresAt - now) / 1000))
		),
		verifiedSeconds: Math.min(
			EMAIL_VERIFICATION_POLICY.verifiedLifetimeSeconds,
			Math.max(0, Math.ceil((verifiedUntil - now) / 1000))
		),
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
