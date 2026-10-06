import type { IntegrationView } from '@/types/integration'

export const INTEGRATION_VIEW_TRANSITION_MODE = 'wait' as const

export const INTEGRATION_VIEW_TRANSITION = {
	duration: 0.16,
	ease: 'easeOut',
} as const

export type IntegrationViewDirection = -1 | 0 | 1

export const getIntegrationViewKey = (view: IntegrationView): string => (view.kind === 'list' ? 'list' : `detail:${view.id}`)

export const getIntegrationViewDirection = (
	previousKind: IntegrationView['kind'] | null,
	kind: IntegrationView['kind']
): IntegrationViewDirection => {
	if (!previousKind) return 0
	if (previousKind === 'list' && kind === 'detail') return 1
	if (previousKind === 'detail' && kind === 'list') return -1
	return 0
}

const createIntegrationViewOffset = (direction: IntegrationViewDirection, reduceMotion: boolean | null, multiplier: 1 | -1) => {
	if (reduceMotion || direction === 0) return 0
	return direction * 6 * multiplier
}

export const createIntegrationViewVariants = (reduceMotion: boolean | null) => ({
	initial: (direction: IntegrationViewDirection) => ({
		opacity: 0,
		x: createIntegrationViewOffset(direction, reduceMotion, 1),
	}),
	animate: { opacity: 1, x: 0 },
	exit: (direction: IntegrationViewDirection) => ({
		opacity: 0,
		x: createIntegrationViewOffset(direction, reduceMotion, -1),
	}),
})
