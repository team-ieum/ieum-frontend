import { useState } from 'react'
import { NAV_ITEMS } from '@/constants/layout'
import type { RouteTransitionDirection } from '@/components/routing/routeTransitionMotion'

const DEFAULT_ROUTE_TRANSITION_DIRECTION: RouteTransitionDirection = {
	axis: 'y',
	direction: 1,
}

const getSidebarRouteIndex = (pathname: string) =>
	NAV_ITEMS.findIndex(item => pathname === item.path || pathname.startsWith(`${item.path}/`))

const isWorkflowRoot = (pathname: string) => pathname === '/workflow'

type RouteTransitionViewModel = {
	transitionDirection: RouteTransitionDirection
}

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

export const useRouteTransitionViewModel = (pathname: string): RouteTransitionViewModel => {
	const [transitionState, setTransitionState] = useState(() => ({
		pathname,
		direction: getRouteTransitionDirection(null, pathname),
	}))
	let transitionDirection = transitionState.direction

	if (transitionState.pathname !== pathname) {
		transitionDirection = getRouteTransitionDirection(transitionState.pathname, pathname)
		setTransitionState({ pathname, direction: transitionDirection })
	}

	return { transitionDirection }
}
