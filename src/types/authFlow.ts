import type { FormEventHandler } from 'react'
import type { ResetPasswordValues, SignupValues } from '@/schemas/auth'
import type { VerificationPurpose } from '@/types/auth'

export type VerificationStep = 'email' | 'code' | 'details'
export type AuthFlowAction = 'send' | 'verify' | 'signup' | 'reset'

export type EmailVerificationSession = {
	verifiedEmail: string | null
	isVerified: () => boolean
	restart: (message?: string) => void
}

export type EmailVerificationController = EmailVerificationSession & {
	purpose: VerificationPurpose
	step: VerificationStep
	email: string
	code: string
	error: string
	notice: string
	codeSeconds: number
	verifiedSeconds: number
	resendSeconds: number
	codeUnavailable: boolean
	isPending: boolean
	changeEmail: (value: string) => void
	changeCode: (value: string) => void
	submitEmail: FormEventHandler<HTMLFormElement>
	submitCode: FormEventHandler<HTMLFormElement>
	resendCode: () => Promise<void>
}

export type AuthVerificationFormViewModel = Pick<
	EmailVerificationController,
	'step' | 'email' | 'code' | 'notice' | 'codeSeconds' | 'verifiedSeconds' | 'resendSeconds'
> & {
	verificationError: string
	formError: string
	isPending: boolean
	isDetailsPending: boolean
	isVerificationPending: boolean
	isCodeDisabled: boolean
	isSubmitDisabled: boolean
	submitLabel: string
	handleEmailChange: (value: string) => void
	handleCodeChange: (value: string) => void
	handleSubmit: FormEventHandler<HTMLFormElement>
	handleChangeEmail: () => void
	handleResendCode: () => void
	handleBackToLogin: () => void
}

export type SignupFormValues = Omit<SignupValues, 'email'>
export type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>

export type SignupFormViewModel = AuthVerificationFormViewModel & {
	values: SignupFormValues
	errors: SignupFormErrors
	handleChange: (field: keyof SignupFormValues, value: string) => void
}

export type ForgotPasswordFormViewModel = AuthVerificationFormViewModel & {
	values: ResetPasswordValues
	errors: Partial<Record<keyof ResetPasswordValues, string>>
	handleChange: (field: keyof ResetPasswordValues, value: string) => void
}
