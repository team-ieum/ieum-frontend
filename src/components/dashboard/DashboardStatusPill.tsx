import { PILL_SKINS } from '@/constants/dashboard/pillSkins'
import type { StatusPillItem } from '@/types/dashboard'

const DashboardStatusPill = ({ label, value, sub, tone }: StatusPillItem) => {
	const skin = PILL_SKINS[tone]

	return (
		<article
			className={`flex items-center gap-3.5 rounded-brand-md border px-4 py-4 transition-shadow hover:shadow-sm ${skin.wrap}`}
		>
			<div
				className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-xl font-bold tabular-nums ${skin.chip} ${skin.num}`}
			>
				{value}
			</div>
			<div className='flex min-w-0 flex-col gap-0.5'>
				<span className={`inline-flex items-center gap-1.5 typo-body2_semibold ${skin.label}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${skin.dot}`} aria-hidden />
					{label}
				</span>
				<span className='typo-caption1_regular text-neutral-400'>{sub}</span>
			</div>
		</article>
	)
}

export default DashboardStatusPill
