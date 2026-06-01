import { useState } from 'react'
import { signupSchema } from '../../schemas/auth'
import { isApiError } from '../../utils/ApiError'
import { useAuthMode } from '../../stores/useAuthMode'
import { useModalStore } from '../../stores/useModalStore'
import { useRegisterMutation } from './mutations/useRegisterMutation'

type SignupFormValues = {
	name: string
	email: string
	password: string
	passwordConfirm: string
}

type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>

const INITIAL_VALUES: SignupFormValues = {
	name: '',
	email: '',
	password: '',
	passwordConfirm: '',
}

export const useValidatedSignupForm = () => {
	const toLogin = useAuthMode(state => state.toLogin)
	const { mutateAsync, isPending } = useRegisterMutation()
	const openModal = useModalStore(state => state.open)
	const [values, setValues] = useState<SignupFormValues>(INITIAL_VALUES)
	const [errors, setErrors] = useState<SignupFormErrors>({})

	const handleChange = (field: keyof SignupFormValues, value: string) => {
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const parseResult = signupSchema.safeParse(values)

		if (!parseResult.success) {
			const fieldErrors = parseResult.error.flatten().fieldErrors
			setErrors({
				name: fieldErrors.name?.[0],
				email: fieldErrors.email?.[0],
				password: fieldErrors.password?.[0],
				passwordConfirm: fieldErrors.passwordConfirm?.[0],
			})
			return
		}

		setErrors({})

		try {
			const { name, email, password } = parseResult.data
			await mutateAsync({ name, email, password })
			toLogin()
		} catch (error) {
			if (isApiError(error)) {
				if (error.code === 'EMAIL_ALREADY_EXISTS') {
					setErrors({ email: error.message })
				} else {
					openModal('회원가입 오류', error.message)
				}
			} else {
				openModal('회원가입 오류', '회원가입에 실패했어요. 다시 시도해주세요.')
			}
		}
	}

	return { values, errors, isPending, handleChange, handleSubmit }
}
