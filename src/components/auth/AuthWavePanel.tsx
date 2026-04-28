import { motion, useReducedMotion } from 'framer-motion'
import symbolNoLine from '@/assets/symbolNoLine.png'

const waveA = 'M0 95 C 80 70, 170 125, 260 95 C 340 70, 420 110, 520 95 L520 200 L0 200 Z'
const waveB = 'M0 95 C 80 120, 170 70, 260 95 C 340 120, 420 80, 520 95 L520 200 L0 200 Z'
const waveC = 'M0 95 C 80 82, 170 108, 260 95 C 340 82, 420 108, 520 95 L520 200 L0 200 Z'

const AuthWavePanel = () => {
	const reduceMotion = useReducedMotion()

	return (
		<div className='relative hidden min-h-[520px] w-full overflow-hidden bg-[#d8ecf5] lg:block lg:basis-1/2'>
			<div className='absolute inset-0 flex items-center justify-center flex-col pb-8'>
				<img src={symbolNoLine} alt='IEUM 로고' className='w-16 object-contain' />
				<p className='text-4xl font-black tracking-wide'>IEUM</p>
			</div>

			<div className='absolute inset-x-0 bottom-0 h-52'>
				<svg viewBox='0 0 520 200' className='h-full w-full' preserveAspectRatio='none'>
					<motion.path
						fill='#9db0d9'
						initial={{ d: waveA }}
						animate={{ d: reduceMotion ? waveA : [waveA, waveB, waveC, waveA] }}
						transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
					/>
				</svg>
			</div>

			<div className='absolute inset-x-0 bottom-0 h-44'>
				<svg viewBox='0 0 520 200' className='h-full w-full' preserveAspectRatio='none'>
					<motion.path
						fill='#57a3cb'
						initial={{ d: waveB }}
						animate={{ d: reduceMotion ? waveB : [waveB, waveC, waveA, waveB] }}
						transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
					/>
				</svg>
			</div>

			<div className='absolute inset-x-0 bottom-0 h-36'>
				<svg viewBox='0 0 520 200' className='h-full w-full' preserveAspectRatio='none'>
					<motion.path
						fill='#2f88ba'
						initial={{ d: waveC }}
						animate={{ d: reduceMotion ? waveC : [waveC, waveA, waveB, waveC] }}
						transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
					/>
				</svg>
			</div>
		</div>
	)
}

export default AuthWavePanel
