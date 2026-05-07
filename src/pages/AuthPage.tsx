import { useState } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'
import AuthWavePanel from '@/components/auth/AuthWavePanel'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
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
	const [swapDirection, setSwapDirection] = useState<1 | -1>(1)
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
		<section className='flex min-h-screen items-center justify-center bg-[#f0f9ff] px-4 py-8'>
			<LayoutGroup>
				<motion.div
					layout
					transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
					className='w-full max-w-5xl min-h-[700px] overflow-hidden rounded-brand-lg border border-neutral-200 shadow-lg lg:flex lg:flex-row'
				>
					<motion.div layout='position' className={`w-full lg:basis-1/2 ${isSignup ? 'lg:order-2' : 'lg:order-1'}`}>
						<AuthWavePanel />
					</motion.div>

					<motion.div
						layout='position'
						className={`flex w-full items-center justify-center px-8 py-12 lg:basis-1/2 lg:px-12 ${
							isSignup ? 'lg:order-1' : 'lg:order-2'
						}`}
					>
						<AnimatePresence mode='wait' initial={false} custom={swapDirection}>
							<motion.div
								key={mode}
								custom={swapDirection}
								variants={{
									initial: (direction: 1 | -1) => ({ x: direction * 28, opacity: 0 }),
									animate: { x: 0, opacity: 1 },
									exit: (direction: 1 | -1) => ({ x: direction * -28, opacity: 0 }),
								}}
								initial='initial'
								animate='animate'
								exit='exit'
								transition={{ duration: 0.22, ease: 'easeOut' }}
								className='w-full'
							>
								{isSignup ? (
									<SignupForm
										email={formValues.email}
										password={formValues.password}
										passwordConfirm={formValues.passwordConfirm}
										errors={errors}
										onChange={handleInputChange}
										onSubmit={handleSubmit}
										onToggleMode={() => {
											setSwapDirection(-1)
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
											setSwapDirection(1)
											setMode('signup')
											setErrors({})
										}}
									/>
								)}
							</motion.div>
						</AnimatePresence>
					</motion.div>
				</motion.div>
			</LayoutGroup>
		</section>
	)
}

export default AuthPage
