import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

type DashboardCardProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode
}

const DashboardCard = ({ children, className, ...props }: DashboardCardProps) => (
	<div
		{...props}
		className={cn('overflow-hidden rounded-brand-md border border-neutral-200 bg-neutral-white shadow-sm', className)}
	>
		{children}
	</div>
)

export default DashboardCard
