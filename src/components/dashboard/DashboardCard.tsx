import type { DashboardCardProps } from '../../types/dashboard'
import { cn } from '../../utils/cn'

const DashboardCard = ({ children, className }: DashboardCardProps) => (
	<div className={cn('overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm', className)}>
		{children}
	</div>
)

export default DashboardCard
