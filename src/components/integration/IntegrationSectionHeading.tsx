type IntegrationSectionHeadingProps = {
	label: string
	count: number
	desc: string
}

const IntegrationSectionHeading = ({ label, count, desc }: IntegrationSectionHeadingProps) => (
	<div className='flex flex-col gap-1'>
		<div className='flex items-center gap-2'>
			<h2 className='typo-title3_semibold m-0 text-neutral-900'>{label}</h2>
			<span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-main-light-blue px-1.5 typo-caption1_semibold text-main-deep-blue'>
				{count}
			</span>
		</div>
		<p className='typo-body3_regular m-0 text-neutral-500'>{desc}</p>
	</div>
)

export default IntegrationSectionHeading
