import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router'
import {
	createRouteTransitionVariants,
	getRouteTransitionDirection,
	ROUTE_TRANSITION,
	ROUTE_TRANSITION_MODE,
} from './routeTransitionMotion'

export const RouteTransition = () => {
	const { pathname } = useLocation()
	const outlet = useOutlet()
	const reduceMotion = useReducedMotion()
	const [transitionState, setTransitionState] = useState(() => ({
		pathname,
		direction: getRouteTransitionDirection(null, pathname),
	}))
	let transitionDirection = transitionState.direction

	if (transitionState.pathname !== pathname) {
		transitionDirection = getRouteTransitionDirection(transitionState.pathname, pathname)
		setTransitionState({ pathname, direction: transitionDirection })
	}

	const routeVariants = createRouteTransitionVariants(reduceMotion)

	return (
		<div className='grid w-full'>
			<AnimatePresence mode={ROUTE_TRANSITION_MODE} custom={transitionDirection}>
				<motion.div
					key={pathname}
					data-route-transition={pathname}
					custom={transitionDirection}
					variants={routeVariants}
					initial='initial'
					animate='animate'
					exit='exit'
					transition={ROUTE_TRANSITION}
					className='col-start-1 row-start-1 w-full'
				>
					{outlet}
				</motion.div>
			</AnimatePresence>
		</div>
	)
}
