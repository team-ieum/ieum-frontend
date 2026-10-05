import LoginForm from '../components/auth/LoginForm'
import SignupForm from '../components/auth/SignupForm'
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm'
import AuthWavePanel from '../components/auth/AuthWavePanel'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useAuthScreenMode } from '../hooks/auth/useAuthScreenMode'
import type { SwapDirection } from '../types/auth'
import { cn } from '../utils/cn'

const swapVariants = {
	initial: (direction: SwapDirection) => ({ x: direction * 28, opacity: 0 }),
	animate: { x: 0, opacity: 1 },
	exit: (direction: SwapDirection) => ({ x: direction * -28, opacity: 0 }),
}

const authForms = {
	login: LoginForm,
	signup: SignupForm,
	forgotPassword: ForgotPasswordForm,
}

const AuthPage = () => {
	const { mode, swapDirection, isPanelSwapped } = useAuthScreenMode()
	const ActiveForm = authForms[mode]
	const isForgotPassword = mode === 'forgotPassword'

	return (
		<section className='flex min-h-screen items-center justify-center bg-neutral-white px-4 py-8'>
			<LayoutGroup>
				<motion.div
					layout
					transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
					className={cn(
						'w-full max-w-5xl overflow-hidden rounded-brand-lg lg:flex lg:flex-row bg-[#f0f9ff] shadow-[0_0_16px_color-mix(in_srgb,var(--color-main-deep-blue)_25%,transparent)]',
						isForgotPassword ? 'min-h-0 lg:min-h-[700px]' : 'min-h-[700px]'
					)}
				>
					<motion.div
						layout='position'
						className={cn('w-full lg:basis-1/2', isPanelSwapped ? 'lg:order-2' : 'lg:order-1')}
					>
						<AuthWavePanel />
					</motion.div>

					<motion.div
						layout='position'
						className={cn(
							'flex w-full items-center justify-center lg:basis-1/2 lg:px-12',
							isForgotPassword ? 'px-6 py-8 sm:px-8 sm:py-12' : 'px-8 py-12',
							isPanelSwapped ? 'lg:order-1' : 'lg:order-2'
						)}
					>
						<AnimatePresence mode='wait' initial={false} custom={swapDirection}>
							<motion.div
								key={mode}
								custom={swapDirection}
								variants={swapVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								transition={{ duration: 0.22, ease: 'easeOut' }}
								className='w-full'
							>
								<ActiveForm />
							</motion.div>
						</AnimatePresence>
					</motion.div>
				</motion.div>
			</LayoutGroup>
		</section>
	)
}

export default AuthPage
