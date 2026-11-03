import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useChangePasswordMutation } from '@/hooks/user/mutations/useChangePasswordMutation'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/user'
import { useAuthMode } from '@/stores/useAuthMode'
import { useAuthStore } from '@/stores/useAuthStore'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'

type ChangePasswordField = keyof ChangePasswordValues
type ChangePasswordErrors = Partial<Record<ChangePasswordField, string>>

const INITIAL_VALUES: ChangePasswordValues = { currentPassword: '', newPassword: '', newPasswordConfirm: '' }

/** 입력 칸 하나에 붙는 오류는 field로, 그 밖의 오류는 form 전체 문구로 보여 준다. */
const toSubmitError = (error: unknown): { field?: ChangePasswordField; message: string } => {
	if (!isApiError(error)) return { message: '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.' }

	switch (error.code) {
		case 'CURRENT_PASSWORD_MISMATCH':
			return { field: 'currentPassword', message: '현재 비밀번호가 일치하지 않아요.' }
		case 'PASSWORD_SAME_AS_CURRENT':
			return { field: 'newPassword', message: '현재 비밀번호와 다른 비밀번호를 입력해 주세요.' }
		case 'INVALID_INPUT':
			return { field: 'newPassword', message: PASSWORD_RULE_MESSAGE }
		case 'PASSWORD_CHANGE_NOT_SUPPORTED':
			return { message: '소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없어요.' }
		case 'LOGIN_LOCKED':
			return { message: '현재 비밀번호를 여러 번 잘못 입력해 24시간 동안 비밀번호 변경과 로그인이 제한돼요.' }
		default:
			return { message: error.message || '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.' }
	}
}

export const useChangePasswordForm = () => {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const { mutateAsync, isPending } = useChangePasswordMutation()
	const [values, setValues] = useState(INITIAL_VALUES)
	const [errors, setErrors] = useState<ChangePasswordErrors>({})
	const [formError, setFormError] = useState('')

	const onChange = (field: ChangePasswordField) => (value: string) => {
		setValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
		setFormError('')
	}

	const reset = () => {
		setValues(INITIAL_VALUES)
		setErrors({})
		setFormError('')
	}

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (isPending) return

		const parsed = changePasswordSchema.safeParse(values)
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors
			setErrors({
				currentPassword: fieldErrors.currentPassword?.[0],
				newPassword: fieldErrors.newPassword?.[0],
				newPasswordConfirm: fieldErrors.newPasswordConfirm?.[0],
			})
			return
		}

		try {
			await mutateAsync({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword })
		} catch (error) {
			const { field, message } = toSubmitError(error)
			if (field) setErrors({ [field]: message })
			else setFormError(message)
			return
		}

		// 서버가 모든 기기의 세션을 끊었으므로 남은 토큰과 이전 계정의 cache를 지우고 로그인 화면으로 보낸다.
		await navigate('/auth', { replace: true })
		useAuthStore.getState().clearAuth()
		useAuthMode.getState().toLogin()
		queryClient.clear()
		useModalStore.getState().open('비밀번호 변경 완료', '새 비밀번호로 다시 로그인해 주세요.')
	}

	return { values, errors, formError, isPending, onChange, onSubmit, reset }
}
