import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import VerificationCodeInput from './VerificationCodeInput'
import { useEmailVerification } from '@/hooks/auth/useEmailVerification'
import { useAuthMode } from '@/stores/useAuthMode'

const ForgotPasswordForm = () => {
	const verification = useEmailVerification('PASSWORD_RESET')
	const toLogin = useAuthMode(state => state.toLogin)
	return (
		<form
			className='flex w-full flex-col justify-center'
			aria-label='비밀번호 찾기'
			noValidate
			onSubmit={verification.step === 'email' ? verification.submitEmail : verification.submitCode}
		>
			<h1 className='typo-title2_bold text-center text-main-deep-blue'>비밀번호 찾기</h1>
			<p className='mt-3 text-center typo-body2_regular text-neutral-500'>
				{verification.step === 'email'
					? '비밀번호를 재설정할 이메일을 입력해주세요.'
					: verification.step === 'code'
						? '이메일로 받은 인증코드를 입력해주세요.'
						: '새 비밀번호를 설정해주세요.'}
			</p>
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
				{verification.step === 'details' && <p className='typo-body2_regular text-main-deep-blue'>새 비밀번호 입력</p>}
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
				<button type='button' onClick={toLogin} className='typo-caption1_medium text-main-deep-blue'>
					로그인으로 돌아가기
				</button>
			</div>
		</form>
	)
}
export default ForgotPasswordForm
