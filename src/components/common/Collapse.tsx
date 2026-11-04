import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type CollapseProps = {
	open: boolean
	children: ReactNode
	id?: string
	className?: string
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** 내용 높이만큼 위아래로 펼치고 접는다. 닫히면 내용을 DOM에서 뺀다. */
const Collapse = ({ open, children, id, className }: CollapseProps) => {
	const reduceMotion = useReducedMotion()

	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.div
					id={id}
					className={className}
					// 펼치는 동안 내용이 잘려 보이도록 감싸는 요소의 높이만 바꾼다.
					style={{ overflow: 'hidden' }}
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: 'auto', opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={
						reduceMotion
							? { duration: 0 }
							: { height: { duration: 0.32, ease: EASE_OUT }, opacity: { duration: 0.2 } }
					}
				>
					{children}
				</motion.div>
			) : null}
		</AnimatePresence>
	)
}

export default Collapse
