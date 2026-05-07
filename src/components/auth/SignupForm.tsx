import TextInput from '@/components/auth/textInput'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

type SignupFormProps = {
	email: string
	password: string
	passwordConfirm: string
	errors: {
		email?: string
		password?: string
		passwordConfirm?: string
	}
	onChange: (field: 'email' | 'password' | 'passwordConfirm', value: string) => void
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
	onToggleMode: () => void
}

const SignupForm = ({ email, password, passwordConfirm, errors, onChange, onSubmit, onToggleMode }: SignupFormProps) => {
	return (
		<form className='flex w-full flex-col justify-center' onSubmit={onSubmit}>
			<h1 className='typo-Title2_Bold text-center text-main-deep-blue'>회원가입</h1>

			<div className='space-y-4 mt-16'>
				<TextInput text='email' value={email} onChange={value => onChange('email', value)} error={errors.email} />
				<TextInput
					text='password'
					value={password}
					onChange={value => onChange('password', value)}
					error={errors.password}
				/>
				<TextInput
					text='passwordConfirm'
					value={passwordConfirm}
					onChange={value => onChange('passwordConfirm', value)}
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
					onClick={onToggleMode}
					className='typo-Caption1_Medium text-main-deep-blue hover:typo-Caption1_Bold transition-all'
				>
					로그인하기
				</button>
			</div>
		</form>
	)
}

export default SignupForm
