import AuthFlowHeader from './AuthFlowHeader'
import VerificationNavigation from './VerificationNavigation'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import VerificationCodeInput from './VerificationCodeInput'
import { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import { useValidatedForgotPasswordForm } from '@/hooks/auth/useValidatedForgotPasswordForm'
import { useAuthMode } from '@/stores/useAuthMode'

const ForgotPasswordForm = () => {
	const verification = useEmailVerification('PASSWORD_RESET')
	const reset = useValidatedForgotPasswordForm()
	const toLogin = useAuthMode(state => state.toLogin)
	return (
		<form
			className='flex w-full flex-col justify-center'
			aria-label='비밀번호 찾기'
			noValidate
			onSubmit={
				verification.step === 'email'
					? verification.submitEmail
					: verification.step === 'code'
						? verification.submitCode
						: reset.handleSubmit
			}
		>
			<AuthFlowHeader title='비밀번호 찾기' step={verification.step} finalLabel='새 비밀번호' />
			{verification.step !== 'email' && (
				<VerificationNavigation
					email={verification.email}
					onChangeEmail={() => {
						verification.restart()
						reset.resetForm()
					}}
				/>
			)}
			<div className='mt-8 space-y-4 sm:mt-12'>
				{verification.step === 'email' && (
					<TextInput
						text='email'
						value={verification.email}
						onChange={verification.changeEmail}
						error={verification.error}
						autoComplete='email'
					/>
				)}
				{verification.step === 'code' && (
					<VerificationCodeInput
						value={verification.code}
						onChange={verification.changeCode}
						error={verification.error}
					/>
				)}
				{verification.step === 'details' && (
					<>
						<TextInput
							text='password'
							hint={PASSWORD_RULE_MESSAGE}
							label='새 비밀번호'
							value={reset.values.newPassword}
							onChange={value => reset.handleChange('newPassword', value)}
							error={reset.errors.newPassword}
							autoComplete='new-password'
						/>
						<TextInput
							text='passwordConfirm'
							value={reset.values.passwordConfirm}
							onChange={value => reset.handleChange('passwordConfirm', value)}
							error={reset.errors.passwordConfirm}
							autoComplete='new-password'
						/>
					</>
				)}
			</div>
			<div className='mt-8'>
				<AuthSubmitButton
					label={
						verification.step === 'email'
							? '인증코드 받기'
							: verification.step === 'code'
								? '인증코드 확인'
								: '비밀번호 재설정'
					}
					disabled={verification.step === 'details'}
				/>
			</div>
			{verification.notice && (
				<p role='status' className='mt-4 typo-caption1_regular text-main-deep-blue'>
					{verification.notice}
				</p>
			)}
			<div className='pt-6 text-center'>
				<button
					type='button'
					onClick={toLogin}
					className='min-h-10 rounded-brand-md px-3 typo-caption1_medium text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
				>
					로그인으로 돌아가기
				</button>
			</div>
		</form>
	)
}
export default ForgotPasswordForm
