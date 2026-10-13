import { useEffect, useRef, useState, type FormEvent } from 'react'
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth'
import type { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { useResetPasswordMutation } from '@/hooks/auth/mutations/useResetPasswordMutation'
import { isApiError } from '@/utils/ApiError'
import { useAuthMode } from '@/stores/useAuthMode'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'

type Verification = Pick<ReturnType<typeof useEmailVerification>, 'verifiedEmail' | 'restart' | 'isVerified'>
const INITIAL_VALUES: ResetPasswordValues = { newPassword: '', passwordConfirm: '' }
export const useValidatedForgotPasswordForm = (verification: Verification) => {
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
			verification.restart('이메일 인증을 다시 진행해주세요.')
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
			useAuthStore.getState().clearAuth()
			useAuthMode.getState().toLogin()
			useModalStore.getState().open('비밀번호 변경 완료', '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')
		} catch (error) {
			if (!mounted.current || currentEmail.current !== email || useAuthMode.getState().mode !== 'forgotPassword') return
			if (isApiError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
				resetForm()
				verification.restart('이메일 인증을 다시 진행해주세요.')
			} else {
				setFormError(isApiError(error) ? error.message : '비밀번호 재설정에 실패했습니다. 다시 시도해주세요.')
			}
		} finally {
			busy.current = false
		}
	}
	return { resetForm, values, errors, formError, isPending: mutation.isPending, handleChange, handleSubmit }
}
