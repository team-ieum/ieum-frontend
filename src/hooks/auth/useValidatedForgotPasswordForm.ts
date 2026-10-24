import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AUTH_FLOW_ERROR_MESSAGES } from '@/constants/auth/authFlow'
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth'
import type { EmailVerificationSession } from '@/types/authFlow'
import { useResetPasswordMutation } from '@/hooks/auth/mutations/useResetPasswordMutation'
import { isApiError } from '@/utils/ApiError'
import { getAuthFlowError } from '@/utils/auth/authFlowError'
import { useAuthMode } from '@/stores/useAuthMode'
import { useModalStore } from '@/stores/useModalStore'

const INITIAL_VALUES: ResetPasswordValues = { newPassword: '', passwordConfirm: '' }

export const useValidatedForgotPasswordForm = (verification: EmailVerificationSession) => {
	const [values, setValues] = useState(INITIAL_VALUES)
	const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordValues, string>>>({})
	const [formError, setFormError] = useState('')
	const mutation = useResetPasswordMutation()
	const [sessionEmail, setSessionEmail] = useState(verification.verifiedEmail)

	if (sessionEmail !== verification.verifiedEmail) {
		setSessionEmail(verification.verifiedEmail)
		setValues(INITIAL_VALUES)
		setErrors({})
		setFormError('')
	}

	const busy = useRef(false)
	const mounted = useRef(true)
	const currentEmail = useRef(verification.verifiedEmail)
	useEffect(() => {
		currentEmail.current = verification.verifiedEmail
	}, [verification.verifiedEmail])

	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	const resetForm = () => {
		setValues(INITIAL_VALUES)
		setErrors({})
		setFormError('')
	}

	const handleChange = (field: keyof ResetPasswordValues, value: string) => {
		if (busy.current) return
		setValues(previous => ({ ...previous, [field]: value }))
		setErrors(previous => ({ ...previous, [field]: undefined }))
		setFormError('')
	}

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (busy.current) return
		const email = verification.verifiedEmail
		if (!email || !verification.isVerified()) {
			resetForm()
			verification.restart(AUTH_FLOW_ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
			return
		}
		const parsed = resetPasswordSchema.safeParse(values)
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors
			setErrors({ newPassword: fieldErrors.newPassword?.[0], passwordConfirm: fieldErrors.passwordConfirm?.[0] })
			return
		}
		busy.current = true
		setErrors({})
		setFormError('')
		try {
			await mutation.mutateAsync({ email, newPassword: parsed.data.newPassword })
			if (!mounted.current || currentEmail.current !== email || useAuthMode.getState().mode !== 'forgotPassword') return
			resetForm()
			useAuthMode.getState().toLogin()
			useModalStore.getState().open('비밀번호 변경 완료', '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')
		} catch (error) {
			if (!mounted.current || currentEmail.current !== email || useAuthMode.getState().mode !== 'forgotPassword') return
			if (isApiError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
				resetForm()
				verification.restart(getAuthFlowError(error, 'reset', 'PASSWORD_RESET'))
			} else {
				setFormError(getAuthFlowError(error, 'reset', 'PASSWORD_RESET'))
			}
		} finally {
			busy.current = false
		}
	}

	return { resetForm, values, errors, formError, isPending: mutation.isPending, handleChange, handleSubmit }
}
