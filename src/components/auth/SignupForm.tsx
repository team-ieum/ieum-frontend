import VerificationNavigation from './VerificationNavigation'
import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import VerificationCodeInput from './VerificationCodeInput'
import { useValidatedSignupForm } from '@/hooks/auth/useValidatedSignupForm'
import { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { useAuthMode } from '@/stores/useAuthMode'

const SignupForm = () => {
	const verification = useEmailVerification('SIGNUP')
	const { values, errors, handleChange, handleSubmit, resetForm } = useValidatedSignupForm()
	const toLogin = useAuthMode(state => state.toLogin)
	return (
		<form
			className='flex w-full flex-col justify-center'
			aria-label='회원가입'
			noValidate
			onSubmit={
				verification.step === 'email'
					? verification.submitEmail
					: verification.step === 'code'
						? verification.submitCode
						: handleSubmit
			}
		>
			<h1 className='typo-title2_bold text-center text-main-deep-blue'>회원가입</h1>
			<p className='mt-3 text-center typo-body2_regular text-neutral-500'>
				{verification.step === 'email'
					? '가입할 이메일을 입력해주세요.'
					: verification.step === 'code'
						? '이메일로 받은 인증코드를 입력해주세요.'
						: '이름과 비밀번호를 입력해주세요.'}
			</p>
			{verification.step !== 'email' && (
				<VerificationNavigation
					email={verification.email}
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
							text='name'
							value={values.name}
							onChange={value => handleChange('name', value)}
							error={errors.name}
							autoComplete='name'
						/>
						<TextInput
							text='password'
							value={values.password}
							onChange={value => handleChange('password', value)}
							error={errors.password}
							autoComplete='new-password'
						/>
						<TextInput
							text='passwordConfirm'
							value={values.passwordConfirm}
							onChange={value => handleChange('passwordConfirm', value)}
							error={errors.passwordConfirm}
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
								: '회원가입'
					}
					disabled={verification.step === 'details' && !verification.verifiedEmail}
				/>
			</div>
			{verification.notice && (
				<p role='status' className='mt-4 typo-caption1_regular text-main-deep-blue'>
					{verification.notice}
				</p>
			)}
			<div className='flex items-center justify-center gap-4 pt-6'>
				<span className='typo-caption1_medium text-neutral-500'>이미 계정이 있으신가요?</span>
				<button type='button' onClick={toLogin} className='typo-caption1_medium text-main-deep-blue'>
					로그인하기
				</button>
			</div>
		</form>
	)
}
export default SignupForm
