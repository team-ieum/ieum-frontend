import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import VerificationTimer from './VerificationTimer'
import VerificationResend from './VerificationResend'
import AuthFlowHeader from './AuthFlowHeader'
import VerificationNavigation from './VerificationNavigation'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import VerificationCodeInput from './VerificationCodeInput'
import { useValidatedSignupForm } from '@/hooks/auth/useValidatedSignupForm'
import { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { useAuthMode } from '@/stores/useAuthMode'

const SignupForm = () => {
	const verification = useEmailVerification('SIGNUP')
	const { values, errors, handleChange, handleSubmit, resetForm, formError, isPending } = useValidatedSignupForm(verification)
	const toLogin = useAuthMode(state => state.toLogin)
	return (
		<form
			className='flex w-full flex-col justify-center'
			aria-label='회원가입'
			aria-busy={verification.isPending || isPending}
			noValidate
			onSubmit={
				verification.step === 'email'
					? verification.submitEmail
					: verification.step === 'code'
						? verification.submitCode
						: handleSubmit
			}
		>
			<AuthFlowHeader title='회원가입' step={verification.step} finalLabel='가입 정보' />
			{verification.step !== 'email' && (
				<VerificationNavigation
					email={verification.email}
					disabled={verification.isPending || isPending}
					onChangeEmail={() => {
						verification.restart()
						resetForm()
					}}
				/>
			)}
			<div className='space-y-4 mt-8 sm:mt-12'>
				{verification.step === 'email' && (
					<TextInput
						text='email'
						disabled={verification.isPending || isPending}
						value={verification.email}
						onChange={verification.changeEmail}
						error={verification.error}
						autoComplete='email'
					/>
				)}
				{verification.step === 'code' && (
					<VerificationCodeInput
						disabled={verification.isPending || isPending}
						value={verification.code}
						onChange={verification.changeCode}
						error={verification.error}
					/>
				)}
				{verification.step === 'details' && (
					<>
						<TextInput
							text='name'
							disabled={isPending}
							value={values.name}
							onChange={value => handleChange('name', value)}
							error={errors.name}
							autoComplete='name'
						/>
						<TextInput
							text='password'
							disabled={isPending}
							hint={PASSWORD_RULE_MESSAGE}
							value={values.password}
							onChange={value => handleChange('password', value)}
							error={errors.password}
							autoComplete='new-password'
						/>
						<TextInput
							text='passwordConfirm'
							disabled={isPending}
							value={values.passwordConfirm}
							onChange={value => handleChange('passwordConfirm', value)}
							error={errors.passwordConfirm}
							autoComplete='new-password'
						/>
					</>
				)}
			</div>
			{verification.step === 'code' && <VerificationTimer seconds={verification.codeSeconds} />}
			{verification.step === 'details' && <VerificationTimer seconds={verification.verifiedSeconds} verified />}
			<div className='mt-8'>
				<AuthSubmitButton
					label={
						verification.step === 'email'
							? '인증코드 받기'
							: verification.step === 'code'
								? '인증코드 확인'
								: '회원가입'
					}
					disabled={
						verification.isPending ||
						isPending ||
						(verification.step === 'email' && verification.resendSeconds > 0) ||
						(verification.step === 'code' && verification.codeUnavailable) ||
						(verification.step === 'details' && !verification.isVerified())
					}
				/>
			</div>
			{verification.step === 'code' && (
				<VerificationResend
					seconds={verification.resendSeconds}
					isPending={verification.isPending}
					onResend={() => void verification.resendCode()}
				/>
			)}
			{formError && verification.step === 'details' && (
				<p role='alert' className='mt-4 typo-caption1_regular text-danger-700'>
					{formError}
				</p>
			)}
			{verification.notice && (
				<p role='status' className='mt-4 typo-caption1_regular text-main-deep-blue'>
					{verification.notice}
				</p>
			)}
			<div className='flex items-center justify-center gap-4 pt-6'>
				<span className='typo-caption1_medium text-neutral-500'>이미 계정이 있으신가요?</span>
				<button
					type='button'
					onClick={toLogin}
					className='min-h-10 rounded-brand-md px-3 typo-caption1_medium text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
				>
					로그인하기
				</button>
			</div>
		</form>
	)
}
export default SignupForm
