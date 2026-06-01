type SectionLabelProps = {
	icon: React.ReactNode
	children: React.ReactNode
	hint?: string
}

export const SectionLabel = ({ icon, children, hint }: SectionLabelProps) => (
	<div className='mb-2 flex items-center gap-2'>
		<span className='shrink-0 text-neutral-500'>{icon}</span>
		<span className='typo-body3_semibold text-neutral-700'>{children}</span>
		{hint && <span className='typo-caption1_regular ml-auto text-neutral-500'>{hint}</span>}
	</div>
)
