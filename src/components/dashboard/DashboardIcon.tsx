import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowUp,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	CircleX,
	Loader2,
	type LucideIcon,
} from 'lucide-react'
import type { DashboardIconProps } from '../../types/dashboard'
import { cn } from '../../utils/cn'

const ICON_MAP: Record<string, LucideIcon> = {
	check_circle: CheckCircle2,
	cancel: CircleX,
	sync: Loader2,
	chevron_right: ChevronRight,
	expand_more: ChevronDown,
	expand_less: ChevronUp,
	error_outline: AlertCircle,
	warning: AlertTriangle,
	arrow_upward: ArrowUp,
	monitoring: Activity,
}

const DashboardIcon = ({ name, size = 20, fill = 0, className = '' }: DashboardIconProps) => {
	const Icon = ICON_MAP[name]
	if (!Icon) return null

	return (
		<Icon
			size={size}
			className={cn('shrink-0', name === 'sync' && 'animate-spin', fill === 1 && 'fill-current', className)}
			strokeWidth={fill === 1 ? 2.5 : 2}
			aria-hidden
		/>
	)
}

export default DashboardIcon
