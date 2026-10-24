import { PASSWORD_RULE_MESSAGE } from '@/schemas/auth'
import { useSignupFormViewModel } from '@/hooks/auth/useSignupFormViewModel'
import VerificationTimer from './VerificationTimer'
import VerificationResend from './VerificationResend'
import AuthFlowHeader from './AuthFlowHeader'
import VerificationNavigation from './VerificationNavigation'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import VerificationCodeInput from './VerificationCodeInput'

const SignupForm = () => {
	const viewModel = useSignupFormViewModel()

	return (
		<form
			className='flex w-full flex-col justify-center'
			aria-label='회원가입'
			aria-busy={viewModel.isPending}
			noValidate
			onSubmit={viewModel.handleSubmit}
		>
			<AuthFlowHeader title='회원가입' step={viewModel.step} finalLabel='가입 정보' />
			{viewModel.step !== 'email' && (
				<VerificationNavigation
					email={viewModel.email}
					disabled={viewModel.isPending}
					onChangeEmail={viewModel.handleChangeEmail}
				/>
			)}
			<div className='space-y-4 mt-8 sm:mt-12'>
				{viewModel.step === 'email' && (
					<TextInput
						text='email'
						disabled={viewModel.isPending}
						value={viewModel.email}
						onChange={viewModel.handleEmailChange}
						error={viewModel.verificationError}
						autoComplete='email'
					/>
				)}
				{viewModel.step === 'code' && (
					<VerificationCodeInput
						disabled={viewModel.isCodeDisabled}
						value={viewModel.code}
						onChange={viewModel.handleCodeChange}
						error={viewModel.verificationError}
					/>
				)}
				{viewModel.step === 'details' && (
					<>
						<TextInput
							text='name'
							disabled={viewModel.isDetailsPending}
							value={viewModel.values.name}
							onChange={value => viewModel.handleChange('name', value)}
							error={viewModel.errors.name}
							autoComplete='name'
						/>
						<TextInput
							text='password'
							disabled={viewModel.isDetailsPending}
							hint={PASSWORD_RULE_MESSAGE}
							value={viewModel.values.password}
							onChange={value => viewModel.handleChange('password', value)}
							error={viewModel.errors.password}
							autoComplete='new-password'
						/>
						<TextInput
							text='passwordConfirm'
							disabled={viewModel.isDetailsPending}
							value={viewModel.values.passwordConfirm}
							onChange={value => viewModel.handleChange('passwordConfirm', value)}
							error={viewModel.errors.passwordConfirm}
							autoComplete='new-password'
						/>
					</>
				)}
			</div>
			{viewModel.step === 'code' && <VerificationTimer seconds={viewModel.codeSeconds} />}
			{viewModel.step === 'details' && <VerificationTimer seconds={viewModel.verifiedSeconds} verified />}
			<div className='mt-8'>
				<AuthSubmitButton label={viewModel.submitLabel} disabled={viewModel.isSubmitDisabled} />
			</div>
			{viewModel.step === 'code' && (
				<VerificationResend
					seconds={viewModel.resendSeconds}
					isPending={viewModel.isVerificationPending}
					onResend={viewModel.handleResendCode}
				/>
			)}
			{viewModel.formError && viewModel.step === 'details' && (
				<p role='alert' className='mt-4 typo-caption1_regular text-danger-700'>
					{viewModel.formError}
				</p>
			)}
			{viewModel.notice && (
				<p role='status' className='mt-4 typo-caption1_regular text-main-deep-blue'>
					{viewModel.notice}
				</p>
			)}
			<div className='flex items-center justify-center gap-4 pt-6'>
				<span className='typo-caption1_medium text-neutral-500'>이미 계정이 있으신가요?</span>
				<button
					type='button'
					onClick={viewModel.handleBackToLogin}
					className='min-h-10 rounded-brand-md px-3 typo-caption1_medium text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
				>
					로그인하기
				</button>
			</div>
		</form>
	)
}
export default SignupForm
