import { motion, useReducedMotion } from 'framer-motion'
import symbolNoLine from '@/assets/symbolNoLine.png'

// SVG path numbers: `M x y` move to (x,y), `C x1 y1, x2 y2, x y` cubic Bézier (control1, control2, end), `L x y` line to, `Z` close path.
const wave2xA = 'M0 95 C 160 15, 360 185, 520 95 C 680 15, 880 185, 1040 95 L1040 200 L0 200 Z'
const wave2xB = 'M0 95 C 160 185, 360 15, 520 95 C 680 185, 880 15, 1040 95 L1040 200 L0 200 Z'

const AuthWavePanel = () => {
	const reduceMotion = useReducedMotion()

	return (
		<div className='relative hidden h-full min-h-[700px] w-full overflow-hidden bg-[#d8ecf5] lg:block lg:basis-1/2'>
			<div className='absolute inset-0 flex items-center justify-center flex-col pb-8 gap-3'>
				<img src={symbolNoLine} alt='IEUM 로고' className='w-16 object-contain' />
				<p className='font-Logo_Regular text-5xl text-main-deep-blue'>IEUM</p>
			</div>

			{/* back wave (slow drift) */}
			<div className='absolute inset-x-0 bottom-0 h-102'>
				<motion.div
					className='h-full w-[200%]'
					animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
					transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
				>
					<svg viewBox='0 0 1040 200' className='h-full w-full' preserveAspectRatio='none'>
						<motion.path
							fill='#9db0d9'
							fillOpacity={0.85}
							initial={{ d: wave2xA }}
							animate={{ d: reduceMotion ? wave2xA : [wave2xA, wave2xB, wave2xA] }}
							transition={{ duration: 13.5, repeat: Infinity, ease: 'easeInOut' }}
						/>
					</svg>
				</motion.div>
			</div>

			{/* front wave (faster drift) */}
			<div className='absolute inset-x-0 bottom-0 h-96'>
				<motion.div
					className='h-full w-[200%]'
					animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
					transition={{ duration: 15.5, repeat: Infinity, ease: 'linear' }}
				>
					<svg viewBox='0 0 1040 200' className='h-full w-full' preserveAspectRatio='none'>
						<motion.path
							fill='#2f88ba'
							fillOpacity={0.65}
							initial={{ d: wave2xB }}
							animate={{ d: reduceMotion ? wave2xB : [wave2xB, wave2xA, wave2xB] }}
							transition={{ duration: 12.8, repeat: Infinity, ease: 'easeInOut' }}
						/>
					</svg>
				</motion.div>
			</div>
		</div>
	)
}

export default AuthWavePanel
