import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type DashboardCardProps = {
	children: ReactNode
	className?: string
}

const DashboardCard = ({ children, className }: DashboardCardProps) => (
	<div className={cn('overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm', className)}>
		{children}
	</div>
)

export default DashboardCard
