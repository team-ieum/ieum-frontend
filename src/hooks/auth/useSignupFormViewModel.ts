import { AUTH_VERIFICATION_SUBMIT_LABELS } from '@/constants/auth/authFlow'
import { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { useValidatedSignupForm } from '@/hooks/auth/useValidatedSignupForm'
import { useAuthMode } from '@/stores/useAuthMode'
import type { SignupFormViewModel } from '@/types/authFlow'

export const useSignupFormViewModel = (): SignupFormViewModel => {
	const verification = useEmailVerification('SIGNUP')
	const form = useValidatedSignupForm(verification)
	const toLogin = useAuthMode(state => state.toLogin)
	const { step } = verification
	const isPending = verification.isPending || form.isPending
	const isSubmitDisabled =
		isPending ||
		(step === 'email' && verification.resendSeconds > 0) ||
		(step === 'code' && verification.codeUnavailable) ||
		(step === 'details' && !verification.isVerified())

	const handleSubmit = {
		email: verification.submitEmail,
		code: verification.submitCode,
		details: form.handleSubmit,
	}[step]

	const handleChangeEmail = () => {
		verification.restart()
		form.resetForm()
	}

	const handleResendCode = () => {
		void verification.resendCode()
	}

	return {
		step,
		email: verification.email,
		code: verification.code,
		verificationError: verification.error,
		notice: verification.notice,
		codeSeconds: verification.codeSeconds,
		verifiedSeconds: verification.verifiedSeconds,
		resendSeconds: verification.resendSeconds,
		values: form.values,
		errors: form.errors,
		formError: form.formError,
		isPending,
		isDetailsPending: form.isPending,
		isVerificationPending: verification.isPending,
		isCodeDisabled: isPending || verification.codeUnavailable,
		isSubmitDisabled,
		submitLabel: step === 'details' ? '회원가입' : AUTH_VERIFICATION_SUBMIT_LABELS[step],
		handleEmailChange: verification.changeEmail,
		handleCodeChange: verification.changeCode,
		handleChange: form.handleChange,
		handleSubmit,
		handleChangeEmail,
		handleResendCode,
		handleBackToLogin: toLogin,
	}
}
