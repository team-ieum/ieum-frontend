import TextInput from '@/components/auth/textInput'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

type LoginFormProps = {
	email: string
	password: string
	errors: {
		email?: string
		password?: string
	}
	onChange: (field: 'email' | 'password', value: string) => void
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
	onToggleMode: () => void
}

const LoginForm = ({ email, password, errors, onChange, onSubmit, onToggleMode }: LoginFormProps) => {
	return (
		<form className='w-full max-w-sm space-y-4' onSubmit={onSubmit}>
			<div className='space-y-2 text-center'>
				<p className='typo-Title3_Bold text-neutral-800'>로그인</p>
			</div>

			<div className='space-y-3 pt-4'>
				<TextInput text='email' value={email} onChange={value => onChange('email', value)} error={errors.email} />
				<TextInput
					text='password'
					value={password}
					onChange={value => onChange('password', value)}
					error={errors.password}
				/>
			</div>

			<AuthSubmitButton label='로그인' />

			<div className='flex items-center justify-center gap-2 pt-2 text-sm'>
				<span className='text-neutral-500'>계정이 없으신가요?</span>
				<button
					type='button'
					onClick={onToggleMode}
					className='font-semibold text-main-blue underline underline-offset-4'
				>
					회원가입
				</button>
			</div>
		</form>
	)
}

export default LoginForm
