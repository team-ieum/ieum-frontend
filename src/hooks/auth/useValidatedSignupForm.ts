import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AUTH_FLOW_ERROR_MESSAGES } from '@/constants/auth/authFlow'
import { signupSchema } from '@/schemas/auth'
import { isApiError } from '@/utils/ApiError'
import { getAuthFlowError } from '@/utils/auth/authFlowError'
import { useAuthMode } from '@/stores/useAuthMode'
import { useRegisterMutation } from '@/hooks/auth/mutations/useRegisterMutation'
import type { EmailVerificationSession, SignupFormErrors, SignupFormValues } from '@/types/authFlow'

const INITIAL_VALUES: SignupFormValues = { name: '', password: '', passwordConfirm: '' }

export const useValidatedSignupForm = (verification: EmailVerificationSession) => {
	const toLogin = useAuthMode(state => state.toLogin)
	const { mutateAsync, isPending } = useRegisterMutation()
	const [values, setValues] = useState(INITIAL_VALUES)
	const [errors, setErrors] = useState<SignupFormErrors>({})
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
			verification.restart(AUTH_FLOW_ERROR_MESSAGES.EMAIL_NOT_VERIFIED)
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
			if (isApiError(error) && (error.code === 'EMAIL_NOT_VERIFIED' || error.code === 'EMAIL_ALREADY_EXISTS')) {
				resetForm()
				verification.restart(getAuthFlowError(error, 'signup', 'SIGNUP'))
			} else {
				setFormError(getAuthFlowError(error, 'signup', 'SIGNUP'))
			}
		} finally {
			busy.current = false
		}
	}

	return { resetForm, values, errors, formError, isPending, handleChange, handleSubmit }
}
