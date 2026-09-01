import { NAV_ITEMS } from '@/constants/layout'

export const ROUTE_TRANSITION_MODE = 'wait' as const

export const ROUTE_TRANSITION = {
	duration: 0.16,
	ease: 'easeOut',
} as const

export type RouteTransitionDirection = {
	axis: 'x' | 'y'
	direction: -1 | 0 | 1
}

export const DEFAULT_ROUTE_TRANSITION_DIRECTION: RouteTransitionDirection = {
	axis: 'y',
	direction: 1,
}

const getSidebarRouteIndex = (pathname: string) =>
	NAV_ITEMS.findIndex(item => pathname === item.path || pathname.startsWith(`${item.path}/`))

const isWorkflowRoot = (pathname: string) => pathname === '/workflow'

export const getRouteTransitionDirection = (previousPathname: string | null, pathname: string): RouteTransitionDirection => {
	if (!previousPathname) return DEFAULT_ROUTE_TRANSITION_DIRECTION

	const previousRouteIndex = getSidebarRouteIndex(previousPathname)
	const routeIndex = getSidebarRouteIndex(pathname)

	if (previousRouteIndex !== routeIndex) {
		if (previousRouteIndex === -1 || routeIndex === -1) return { axis: 'y', direction: 0 }
		return { axis: 'y', direction: routeIndex > previousRouteIndex ? 1 : -1 }
	}

	if (routeIndex === getSidebarRouteIndex('/workflow')) {
		if (isWorkflowRoot(previousPathname) && !isWorkflowRoot(pathname)) {
			return { axis: 'x', direction: 1 }
		}
		if (!isWorkflowRoot(previousPathname) && isWorkflowRoot(pathname)) {
			return { axis: 'x', direction: -1 }
		}
	}

	return { axis: 'y', direction: 0 }
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
