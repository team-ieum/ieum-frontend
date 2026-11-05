import type { ReactElement } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/utils/cn'

type SkeletonPulseProps = {
	as?: 'div' | 'span'
	className: string
	tone?: 'brand' | 'neutral'
}

const HIGHLIGHT_CLASS_BY_TONE: Record<NonNullable<SkeletonPulseProps['tone']>, string> = {
	brand: 'bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/6%)_28%,rgb(255_255_255/10%)_50%,rgb(255_255_255/6%)_72%,transparent_100%)]',
	neutral:
		'bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/14%)_28%,rgb(255_255_255/24%)_50%,rgb(255_255_255/14%)_72%,transparent_100%)]',
}

const SkeletonPulse = ({ as: Component = 'div', className, tone = 'neutral' }: SkeletonPulseProps): ReactElement => {
	const reduceMotion = useReducedMotion()

	return (
		<Component aria-hidden='true' className={cn('relative overflow-hidden', className)}>
			{!reduceMotion && (
				<motion.span
					data-skeleton-highlight
					className={cn('pointer-events-none absolute inset-y-0 -left-1/2 w-1/2', HIGHLIGHT_CLASS_BY_TONE[tone])}
					initial={{ x: '0%' }}
					animate={{ x: '300%' }}
					transition={{ duration: 1.35, ease: [0.4, 0, 0.2, 1], repeat: Infinity, repeatDelay: 0.35 }}
				/>
			)}
		</Component>
	)
}

export default SkeletonPulse
