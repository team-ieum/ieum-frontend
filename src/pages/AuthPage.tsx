import { useState } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'
import AuthWavePanel from '@/components/auth/AuthWavePanel'
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
				className={`w-full max-w-3xl overflow-hidden rounded-brand-lg border border-neutral-200 bg-neutral-white shadow-lg lg:flex ${
					isSignup ? 'lg:flex-row-reverse' : 'lg:flex-row'
				}`}
			>
				<AuthWavePanel />

				<div className='flex w-full items-center justify-center px-8 py-12 lg:basis-1/2 lg:px-12'>
					{isSignup ? (
						<SignupForm
							email={formValues.email}
							password={formValues.password}
							passwordConfirm={formValues.passwordConfirm}
							errors={errors}
							onChange={handleInputChange}
							onSubmit={handleSubmit}
							onToggleMode={() => {
								setMode('login')
								setErrors({})
							}}
						/>
					) : (
						<LoginForm
							email={formValues.email}
							password={formValues.password}
							errors={errors}
							onChange={handleInputChange}
							onSubmit={handleSubmit}
							onToggleMode={() => {
								setMode('signup')
								setErrors({})
							}}
						/>
					)}
				</div>
			</div>
		</section>
	)
}

export default AuthPage
