type HeaderProps = {
	onMenuClick: () => void
}

export const Header = ({ onMenuClick }: HeaderProps) => {
	return (
		<header className='fixed top-0 left-0 z-40 flex h-(--layout-header-height) w-full items-center justify-between border-b border-neutral-200 bg-neutral-white px-4 lg:px-6'>
			<div className='flex items-center gap-3'>
				<button
					type='button'
					onClick={onMenuClick}
					className='flex h-9 w-9 items-center justify-center rounded-brand-sm border border-neutral-300 text-neutral-700 transition-colors hover:bg-neutral-100 lg:hidden'
					aria-label='사이드바 열기'
				>
					<span aria-hidden='true'>☰</span>
				</button>
				<strong className='text-neutral-800'>IEUM</strong>
			</div>
		</header>
	)
}
