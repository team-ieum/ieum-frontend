export const ROUTE_TRANSITION_MODE = 'wait' as const

export const ROUTE_TRANSITION = {
	duration: 0.16,
	ease: 'easeOut',
} as const

export type RouteTransitionDirection = {
	axis: 'x' | 'y'
	direction: -1 | 0 | 1
}

const createRouteOffset = (transitionDirection: RouteTransitionDirection, reduceMotion: boolean | null, multiplier: 1 | -1) => {
	const offset = reduceMotion ? 0 : transitionDirection.direction * 6 * multiplier
	return transitionDirection.axis === 'x' ? { x: offset, y: 0 } : { x: 0, y: offset }
}

export const createRouteTransitionVariants = (reduceMotion: boolean | null) => ({
	initial: (transitionDirection: RouteTransitionDirection) => ({
		opacity: 0,
		...createRouteOffset(transitionDirection, reduceMotion, 1),
	}),
	animate: { opacity: 1, x: 0, y: 0 },
	exit: (transitionDirection: RouteTransitionDirection) => ({
		opacity: 0,
		...createRouteOffset(transitionDirection, reduceMotion, -1),
	}),
})
