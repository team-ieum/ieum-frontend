import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import { useSignupForm } from '../../hooks/auth/useSignupForm'
import { useAuthMode } from '../../stores/useAuthMode'

const SignupForm = () => {
	const { values, errors, handleChange, handleSubmit } = useSignupForm()
	const toLogin = useAuthMode(state => state.toLogin)

	return (
		<form className='flex w-full flex-col justify-center' onSubmit={handleSubmit}>
			<h1 className='typo-Title2_Bold text-center text-main-deep-blue'>회원가입</h1>

			<div className='space-y-4 mt-16'>
				<TextInput
					text='email'
					value={values.email}
					onChange={value => handleChange('email', value)}
					error={errors.email}
				/>
				<TextInput
					text='password'
					value={values.password}
					onChange={value => handleChange('password', value)}
					error={errors.password}
				/>
				<TextInput
					text='passwordConfirm'
					value={values.passwordConfirm}
					onChange={value => handleChange('passwordConfirm', value)}
					error={errors.passwordConfirm}
				/>
			</div>

			<div className='mt-13'>
				<AuthSubmitButton label='회원가입' />
			</div>

			<div className='flex items-center justify-center gap-4 pt-6'>
				<span className='typo-Caption1_Medium text-neutral-500'>이미 계정이 있으신가요?</span>
				<button
					type='button'
					onClick={toLogin}
					className='typo-Caption1_Medium text-main-deep-blue hover:typo-Caption1_Bold transition-all'
				>
					로그인하기
				</button>
			</div>
		</form>
	)
}

export default SignupForm
