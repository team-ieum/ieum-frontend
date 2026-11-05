import { useChangePasswordForm } from '@/hooks/user/useChangePasswordForm'
import { useResetOnClose } from '@/hooks/user/useResetOnClose'
import type { PasswordChangeFormViewModel } from '@/types/user'

export const usePasswordChangeFormViewModel = (isOpen: boolean): PasswordChangeFormViewModel => {
	const form = useChangePasswordForm()
	useResetOnClose(isOpen, form.reset)

	return {
		values: form.values,
		errors: form.errors,
		formError: form.formError,
		isRuleVisible: !form.errors.newPassword,
		isInputDisabled: form.isPending,
		isSubmitDisabled: form.isPending,
		submitLabel: form.isPending ? '변경 중...' : '비밀번호 변경',
		handleChange: form.handleChange,
		handleSubmit: event => void form.handleSubmit(event),
	}
}
