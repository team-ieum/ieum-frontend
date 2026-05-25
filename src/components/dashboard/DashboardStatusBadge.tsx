import type { DashboardStatusBadgeProps, RunStatus, StatusBadgeConfig } from '../../types/dashboard'
import DashboardIcon from './DashboardIcon'

const STATUS_MAP: Record<RunStatus, StatusBadgeConfig> = {
	success: {
		label: '성공',
		icon: 'check_circle',
		pill: 'bg-main-light-blue text-main-deep-blue border-main-light-blue',
	},
	error: {
		label: '오류',
		icon: 'cancel',
		pill: 'bg-danger-100 text-danger-700 border-danger-300',
	},
	running: {
		label: '실행 중',
		icon: 'sync',
		pill: 'bg-neutral-white text-neutral-600 border-neutral-300',
	},
}

const DashboardStatusBadge = ({ status }: DashboardStatusBadgeProps) => {
	const config = STATUS_MAP[status]
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 typo-caption1_semibold ${config.pill}`}
		>
			<DashboardIcon name={config.icon} size={12} fill={status === 'error' ? 1 : 0} />
			{config.label}
		</span>
	)
}

export default DashboardStatusBadge
