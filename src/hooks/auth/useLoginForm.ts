import { useState } from 'react'
import { useNavigate } from 'react-router'
import { loginSchema } from '../../schemas/auth'

type LoginFormValues = {
	email: string
	password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>

const INITIAL_VALUES: LoginFormValues = {
	email: '',
	password: '',
}

export const useLoginForm = () => {
	const navigate = useNavigate()
	const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES)
	const [errors, setErrors] = useState<LoginFormErrors>({})

	const handleChange = (field: keyof LoginFormValues, value: string) => {
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const parseResult = loginSchema.safeParse(values)

		if (!parseResult.success) {
			const fieldErrors = parseResult.error.flatten().fieldErrors
			setErrors({
				email: fieldErrors.email?.[0],
				password: fieldErrors.password?.[0],
			})
			return
		}

		setErrors({})
		// TODO: 추후 실제 로그인 API 연동
		navigate('/main')
	}

	return { values, errors, handleChange, handleSubmit }
}
