import { useState } from 'react'
import TextInput from '@/components/auth/textInput'
import { z } from 'zod'

type AuthMode = 'login' | 'signup'
type FormValues = {
	email: string
	password: string
	passwordConfirm: string
}

const loginSchema = z.object({
	email: z.email('이메일 형식이 올바르지 않습니다.'),
	password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

const signupSchema = loginSchema
	.extend({
		passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
	})
	.refine(data => data.password === data.passwordConfirm, {
		path: ['passwordConfirm'],
		message: '비밀번호가 일치하지 않습니다.',
	})

const AuthPage = () => {
	const [mode, setMode] = useState<AuthMode>('login')
	const isSignup = mode === 'signup'
	const [formValues, setFormValues] = useState<FormValues>({
		email: '',
		password: '',
		passwordConfirm: '',
	})
	const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})

	const handleInputChange = (field: keyof FormValues, value: string) => {
		setFormValues(prev => ({ ...prev, [field]: value }))
		setErrors(prev => ({ ...prev, [field]: undefined }))
	}

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (isSignup) {
			const parseResult = signupSchema.safeParse(formValues)

			if (!parseResult.success) {
				const fieldErrors = parseResult.error.flatten().fieldErrors
				setErrors({
					email: fieldErrors.email?.[0],
					password: fieldErrors.password?.[0],
					passwordConfirm: fieldErrors.passwordConfirm?.[0],
				})
				return
			}
		} else {
			const parseResult = loginSchema.safeParse({
				email: formValues.email,
				password: formValues.password,
			})

			if (!parseResult.success) {
				const fieldErrors = parseResult.error.flatten().fieldErrors
				setErrors({
					email: fieldErrors.email?.[0],
					password: fieldErrors.password?.[0],
					passwordConfirm: undefined,
				})
				return
			}
		}

		setErrors({})
	}

	return (
		<section className='flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-8'>
			<div
				className={`w-full max-w-5xl overflow-hidden rounded-brand-lg border border-neutral-200 bg-neutral-white shadow-lg lg:flex ${
					isSignup ? 'lg:flex-row-reverse' : 'lg:flex-row'
				}`}
			>
				<div className='relative hidden min-h-[520px] flex-1 overflow-hidden bg-[#d8ecf5] lg:block'>
					<p className='text-4xl font-black tracking-wide'>IEUM</p>
				</div>

				<div className='flex flex-1 items-center justify-center px-8 py-12 lg:px-12'>
					<form className='w-full max-w-sm space-y-4' onSubmit={handleSubmit}>
						<div className='space-y-2 text-center'>
							<p className='text-2xl font-bold text-neutral-800'>{isSignup ? '회원가입' : '로그인'}</p>
						</div>

						<div className='space-y-3 pt-4'>
							<TextInput
								text='email'
								value={formValues.email}
								onChange={value => handleInputChange('email', value)}
								error={errors.email}
							/>
							<TextInput
								text='password'
								value={formValues.password}
								onChange={value => handleInputChange('password', value)}
								error={errors.password}
							/>
							{isSignup && (
								<TextInput
									text='passwordConfirm'
									value={formValues.passwordConfirm}
									onChange={value => handleInputChange('passwordConfirm', value)}
									error={errors.passwordConfirm}
								/>
							)}
						</div>

						<button
							type='submit'
							className='mt-2 h-11 w-full rounded-brand-sm bg-main-blue font-semibold text-neutral-white transition hover:opacity-90'
						>
							{isSignup ? '회원가입' : '로그인'}
						</button>

						<div className='flex items-center justify-center gap-2 pt-2 text-sm'>
							<span className='text-neutral-500'>
								{isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
							</span>
							<button
								type='button'
								onClick={() => {
									setMode(isSignup ? 'login' : 'signup')
									setErrors({})
								}}
								className='font-semibold text-main-blue underline underline-offset-4'
							>
								{isSignup ? '로그인' : '회원가입'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</section>
	)
}

export default AuthPage
