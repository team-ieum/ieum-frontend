import type { StatusPillSkins } from '../../types/dashboard'

export const PILL_SKINS: StatusPillSkins = {
	active: {
		wrap: 'bg-main-light-blue border-main-light-blue',
		chip: 'bg-neutral-white border-main-light-blue',
		num: 'text-main-deep-blue',
		dot: 'bg-main-blue',
		label: 'text-main-deep-blue',
	},
	running: {
		wrap: 'bg-neutral-white border-neutral-200',
		chip: 'bg-neutral-white border-neutral-200',
		num: 'text-main-deep-blue',
		dot: 'bg-main-blue',
		label: 'text-neutral-600',
	},
	inactive: {
		wrap: 'bg-neutral-white border-neutral-200',
		chip: 'bg-neutral-white border-neutral-200',
		num: 'text-neutral-900',
		dot: 'bg-neutral-400',
		label: 'text-neutral-600',
	},
	error: {
		wrap: 'bg-danger-100 border-danger-300',
		chip: 'bg-neutral-white border-danger-300',
		num: 'text-danger-700',
		dot: 'bg-danger-600',
		label: 'text-danger-700',
	},
}
