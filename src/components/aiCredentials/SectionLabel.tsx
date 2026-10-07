type SectionLabelProps = {
	icon: React.ReactNode
	children: React.ReactNode
	hint?: string
	/** hint를 입력의 `aria-describedby`로 연결할 때 사용할 id */
	hintId?: string
}

export const SectionLabel = ({ icon, children, hint, hintId }: SectionLabelProps) => (
	<div className='mb-2 flex items-center gap-2'>
		<span className='shrink-0 text-neutral-500'>{icon}</span>
		<span className='typo-body3_semibold text-neutral-700'>{children}</span>
		{hint && (
			<span id={hintId} className='typo-caption1_regular ml-auto text-neutral-500'>
				{hint}
			</span>
		)}
	</div>
)
