import { useEffect, useRef, useState, type FormEvent } from 'react'
import { signupSchema } from '@/schemas/auth'
import { isApiError } from '@/utils/ApiError'
import { useAuthMode } from '@/stores/useAuthMode'
import { useRegisterMutation } from '@/hooks/auth/mutations/useRegisterMutation'
import type { useEmailVerification } from '@/hooks/auth/useEmailVerification'

type SignupFormValues = { name: string; password: string; passwordConfirm: string }
const INITIAL_VALUES: SignupFormValues = { name: '', password: '', passwordConfirm: '' }
type Verification = Pick<ReturnType<typeof useEmailVerification>, 'verifiedEmail' | 'restart' | 'isVerified'>

export const useValidatedSignupForm = (verification: Verification) => {
	const toLogin = useAuthMode(state => state.toLogin)
	const { mutateAsync, isPending } = useRegisterMutation()
	const [values, setValues] = useState(INITIAL_VALUES)
	const [errors, setErrors] = useState<Partial<Record<keyof SignupFormValues, string>>>({})
	const [formError, setFormError] = useState('')
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
	const handleChange = (field: keyof SignupFormValues, value: string) => {
		if (busy.current) return
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
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
		const parsed = signupSchema.safeParse({ ...values, email })
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors
			setErrors({
				name: fieldErrors.name?.[0],
				password: fieldErrors.password?.[0],
				passwordConfirm: fieldErrors.passwordConfirm?.[0],
			})
			return
		}
		busy.current = true
		setErrors({})
		setFormError('')
		try {
			await mutateAsync({ name: parsed.data.name, email, password: parsed.data.password })
			if (mounted.current && currentEmail.current === email && useAuthMode.getState().mode === 'signup') toLogin()
		} catch (error) {
			if (!mounted.current || currentEmail.current !== email || useAuthMode.getState().mode !== 'signup') return
			if (isApiError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
				resetForm()
				verification.restart('이메일 인증을 다시 진행해주세요.')
			} else if (isApiError(error) && error.code === 'EMAIL_ALREADY_EXISTS') {
				resetForm()
				verification.restart('이미 가입된 이메일입니다. 로그인해주세요.')
			} else {
				setFormError(isApiError(error) ? error.message : '회원가입에 실패했습니다. 다시 시도해주세요.')
			}
		} finally {
			busy.current = false
		}
	}
	return { resetForm, values, errors, formError, isPending, handleChange, handleSubmit }
}
