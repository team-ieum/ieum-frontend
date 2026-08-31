import type { ReactElement } from 'react'
import { cn } from '@/utils/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

type SpinnerProps = {
	size?: SpinnerSize
	className?: string
	label?: string
}

const sizeClass: Record<SpinnerSize, string> = {
	sm: 'size-4 border-2',
	md: 'size-8 border-[3px]',
	lg: 'size-12 border-4',
}

const Spinner = ({ size = 'md', className, label = '로딩 중' }: SpinnerProps): ReactElement => (
	<span
		role='status'
		aria-label={label}
		className={cn('block animate-spin rounded-full border-main-blue/20 border-t-main-blue', sizeClass[size], className)}
	/>
)

export default Spinner
