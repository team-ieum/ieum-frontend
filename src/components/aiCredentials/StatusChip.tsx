type StatusChipProps = {
	connected: boolean
}

export const StatusChip = ({ connected }: StatusChipProps) => {
	if (connected) {
		return (
			<span className='typo-caption1_medium inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EE] px-3 py-1.5 text-node-green'>
				<span className='h-1.5 w-1.5 rounded-full bg-node-green' />
				연결됨
			</span>
		)
	}
	return (
		<span className='typo-caption1_medium inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-500'>
			미연결
		</span>
	)
}
