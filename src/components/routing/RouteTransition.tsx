import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router'
import { createRouteTransitionVariants, ROUTE_TRANSITION, ROUTE_TRANSITION_MODE } from './routeTransitionMotion'
import { useRouteTransitionViewModel } from '@/hooks/routing/useRouteTransitionViewModel'

export const RouteTransition = () => {
	const { pathname } = useLocation()
	const outlet = useOutlet()
	const reduceMotion = useReducedMotion()
	const { transitionDirection } = useRouteTransitionViewModel(pathname)
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
