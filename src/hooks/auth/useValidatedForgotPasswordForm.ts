import { useState, type FormEvent } from 'react'
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth'

export const useValidatedForgotPasswordForm = () => {
	const [values, setValues] = useState<ResetPasswordValues>({ newPassword: '', passwordConfirm: '' })
	const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordValues, string>>>({})
	const [notice, setNotice] = useState('')
	const handleChange = (field: keyof ResetPasswordValues, value: string) => {
		setValues(previous => ({ ...previous, [field]: value }))
		setErrors(previous => ({ ...previous, [field]: undefined }))
		setNotice('')
	}
	const handleSubmit = (event: FormEvent) => {
		event.preventDefault()
		const parsed = resetPasswordSchema.safeParse(values)
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors
			setErrors({ newPassword: fieldErrors.newPassword?.[0], passwordConfirm: fieldErrors.passwordConfirm?.[0] })
			return
		}
		setErrors({})
		setNotice('비밀번호 재설정 기능을 연결 중입니다.')
	}
	return { values, errors, notice, handleChange, handleSubmit }
}
