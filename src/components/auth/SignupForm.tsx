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
		<form className='w-full max-w-sm space-y-4' onSubmit={onSubmit}>
			<div className='space-y-2 text-center'>
				<p className='text-2xl font-bold text-neutral-800'>회원가입</p>
			</div>

			<div className='space-y-3 pt-4'>
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

			<AuthSubmitButton label='회원가입' />

			<div className='flex items-center justify-center gap-2 pt-2 text-sm'>
				<span className='text-neutral-500'>이미 계정이 있으신가요?</span>
				<button
					type='button'
					onClick={onToggleMode}
					className='font-semibold text-main-blue underline underline-offset-4'
				>
					로그인
				</button>
			</div>
		</form>
	)
}

export default SignupForm
