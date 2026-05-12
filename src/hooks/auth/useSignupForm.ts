import { useState } from 'react'
import { signupSchema } from '../../schemas/auth'

type SignupFormValues = {
	email: string
	password: string
	passwordConfirm: string
}

type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>

const INITIAL_VALUES: SignupFormValues = {
	email: '',
	password: '',
	passwordConfirm: '',
}

export const useSignupForm = () => {
	const [values, setValues] = useState<SignupFormValues>(INITIAL_VALUES)
	const [errors, setErrors] = useState<SignupFormErrors>({})

	const handleChange = (field: keyof SignupFormValues, value: string) => {
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const parseResult = signupSchema.safeParse(values)

		if (!parseResult.success) {
			const fieldErrors = parseResult.error.flatten().fieldErrors
			setErrors({
				email: fieldErrors.email?.[0],
				password: fieldErrors.password?.[0],
				passwordConfirm: fieldErrors.passwordConfirm?.[0],
			})
			return
		}

		setErrors({})
		// TODO: 추후 실제 회원가입 API 연동
	}

	return { values, errors, handleChange, handleSubmit }
}
