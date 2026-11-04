import { PILL_SKINS } from '@/constants/dashboard/pillSkins'
import type { StatusPillItem } from '@/types/dashboard'
import { cn } from '@/utils/cn'

const DashboardStatusPill = ({ label, value, sub, tone }: StatusPillItem) => {
	const skin = PILL_SKINS[tone]

	return (
		<article
			className={cn(
				'flex items-center gap-3.5 rounded-brand-md border px-4 py-4 transition-shadow hover:shadow-sm',
				skin.wrap
			)}
		>
			<div
				className={cn(
					'grid h-11 w-11 shrink-0 place-items-center rounded-xl border typo-title2_bold',
					skin.chip,
					skin.num
				)}
			>
				{/* typo-*의 font 단축 속성이 font-variant-numeric을 초기화하므로 tabular-nums는 안쪽 요소에 둔다. */}
				<span className='tabular-nums'>{value}</span>
			</div>
			<div className='flex min-w-0 flex-col gap-0.5'>
				<span className={cn('inline-flex items-center gap-1.5 typo-body2_semibold', skin.label)}>
					<span className={cn('h-1.5 w-1.5 rounded-full', skin.dot)} aria-hidden />
					{label}
				</span>
				<span className='typo-caption1_regular text-neutral-400'>{sub}</span>
			</div>
		</article>
	)
}

export default DashboardStatusPill
