import TextInput from './textInput'
import AuthSubmitButton from './AuthSubmitButton'
import GoogleSignInButton from './GoogleSignInButton'
import { useValidatedLoginForm } from '../../hooks/auth/useValidatedLoginForm'
import { useAuthMode } from '../../stores/useAuthMode'

const LoginForm = () => {
	const { values, errors, handleChange, handleSubmit } = useValidatedLoginForm()
	const toSignup = useAuthMode(state => state.toSignup)

	return (
		<form className='w-full flex flex-col justify-center' onSubmit={handleSubmit}>
			<div className='text-center'>
				<p className='typo-title2_bold text-main-deep-blue'>로그인</p>
			</div>

			<div className='space-y-4 pt-16 mb-13'>
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
			</div>

			<AuthSubmitButton label='로그인' />

			<div className='space-y-6 pt-6'>
				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<span className='w-full border-t border-main-blue' />
					</div>
					<div className='relative flex justify-center'>
						<span className='bg-[#f0f9ff] px-2 typo-caption1_bold text-main-deep-blue'>또는</span>
					</div>
				</div>

				<div className='flex justify-center'>
					<GoogleSignInButton />
				</div>

				<div className='flex items-center justify-center gap-10'>
					<button
						type='button'
						className='typo-caption1_medium text-main-deep-blue hover:typo-caption1_bold transition-all'
					>
						비밀번호 찾기
					</button>
					<button
						type='button'
						onClick={toSignup}
						className='typo-caption1_medium text-main-deep-blue hover:typo-caption1_bold transition-all'
					>
						회원가입하기
					</button>
				</div>
			</div>
		</form>
	)
}

export default LoginForm
