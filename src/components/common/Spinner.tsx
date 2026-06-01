import { cn } from '@/utils/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

type SpinnerProps = {
	size?: SpinnerSize
	className?: string
}

const sizeClass: Record<SpinnerSize, string> = {
	sm: 'size-4 border-2',
	md: 'size-8 border-[3px]',
	lg: 'size-12 border-4',
}

const Spinner = ({ size = 'md', className }: SpinnerProps) => (
	<span
		role='status'
		aria-label='로딩 중'
		className={cn('block animate-spin rounded-full border-main-blue/20 border-t-main-blue', sizeClass[size], className)}
	/>
)

export default Spinner
