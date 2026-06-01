import { useState } from 'react'
import { useNavigate } from 'react-router'
import { loginSchema } from '@/schemas/auth'
import { isApiError } from '@/utils/ApiError'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'
import { useLoginMutation } from '@/hooks/auth/mutations/useLoginMutation'

type LoginFormValues = {
	email: string
	password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>

const INITIAL_VALUES: LoginFormValues = {
	email: '',
	password: '',
}

export const useValidatedLoginForm = () => {
	const navigate = useNavigate()
	const { mutateAsync, isPending } = useLoginMutation()
	const setAuth = useAuthStore(state => state.setAuth)
	const openModal = useModalStore(state => state.open)
	const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES)
	const [errors, setErrors] = useState<LoginFormErrors>({})

	const handleChange = (field: keyof LoginFormValues, value: string) => {
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
	}

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

		try {
			const { email, password } = parseResult.data
			const response = await mutateAsync({ email, password })
			setAuth(response.data.accessToken, response.data.refreshToken)
			navigate('/main')
		} catch (error) {
			if (isApiError(error)) {
				openModal('로그인 오류', error.message)
			} else {
				openModal('로그인 오류', '로그인에 실패했어요. 다시 시도해주세요.')
			}
		}
	}

	return { values, errors, isPending, handleChange, handleSubmit }
}
