import { useState, type FormEvent } from 'react'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/schemas/auth'

type ForgotPasswordErrors = Partial<Record<keyof ForgotPasswordValues, string>>

export const useValidatedForgotPasswordForm = () => {
	const [values, setValues] = useState<ForgotPasswordValues>({ name: '', email: '' })
	const [errors, setErrors] = useState<ForgotPasswordErrors>({})
	const [showUnavailableNotice, setShowUnavailableNotice] = useState(false)

	const handleChange = (field: keyof ForgotPasswordValues, value: string) => {
		setValues(previous => ({ ...previous, [field]: value }))
		setErrors(previous => ({ ...previous, [field]: undefined }))
		setShowUnavailableNotice(false)
	}

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setShowUnavailableNotice(false)
		const result = forgotPasswordSchema.safeParse(values)

		if (!result.success) {
			const fieldErrors = result.error.flatten().fieldErrors
			setErrors({ name: fieldErrors.name?.[0], email: fieldErrors.email?.[0] })
			return
		}

		setValues(result.data)
		setErrors({})
		setShowUnavailableNotice(true)
	}

	return { values, errors, showUnavailableNotice, handleChange, handleSubmit }
}
