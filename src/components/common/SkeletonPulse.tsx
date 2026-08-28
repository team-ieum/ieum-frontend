import type { ReactElement } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/utils/cn'

type SkeletonPulseProps = {
	as?: 'div' | 'span'
	className: string
	tone?: 'brand' | 'neutral'
}

const highlightByTone = {
	brand: 'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 6%) 28%, rgb(255 255 255 / 10%) 50%, rgb(255 255 255 / 6%) 72%, transparent 100%)',
	neutral:
		'linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 14%) 28%, rgb(255 255 255 / 24%) 50%, rgb(255 255 255 / 14%) 72%, transparent 100%)',
} as const

const SkeletonPulse = ({ as: Component = 'div', className, tone = 'neutral' }: SkeletonPulseProps): ReactElement => {
	const reduceMotion = useReducedMotion()

	return (
		<Component aria-hidden='true' className={cn('relative overflow-hidden', className)}>
			{!reduceMotion && (
				<motion.span
					data-skeleton-highlight
					className='pointer-events-none absolute inset-y-0 -left-1/2 w-1/2'
					style={{ background: highlightByTone[tone] }}
					initial={{ x: '0%' }}
					animate={{ x: '300%' }}
					transition={{ duration: 1.35, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 0.35 }}
				/>
			)}
		</Component>
	)
}

export default SkeletonPulse
