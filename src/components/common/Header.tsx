import { useNavigate } from 'react-router'
import logoSymbol from '../../assets/symbol.png'
import { Bell, ChevronRight, Menu, Search } from 'lucide-react'

type HeaderUser = {
	name: string
	initial?: string
}

type HeaderProps = {
	onMenuClick: () => void
	crumb?: string
	user?: HeaderUser
	notificationCount?: number
	onNotifications?: () => void
}

export const Header = ({
	onMenuClick,
	crumb = '대시보드',
	user = { name: '관리자', initial: '관' },
	notificationCount = 0,
	onNotifications,
}: HeaderProps) => {
	const navigate = useNavigate()
	const initial = user.initial ?? user.name.slice(0, 1)
	const hasNotifications = notificationCount > 0

	return (
		<header className='fixed top-0 left-0 z-40 flex h-(--layout-header-height) w-full items-center gap-3.5 border-b border-[#cde9f4] bg-linear-to-b from-[#EAF7FE] to-main-light-blue px-4 lg:px-5'>
			{/* 모바일 햄버거 */}
			<button
				type='button'
				onClick={onMenuClick}
				className='flex h-9 w-9 items-center justify-center rounded-brand-sm border border-[#cde9f4] bg-white/60 text-main-deep-blue transition-colors hover:bg-white lg:hidden'
				aria-label='사이드바 열기'
			>
				<Menu size={18} />
			</button>

			{/* 로고 + IEUM 타이틀 */}
			<button
				type='button'
				onClick={() => navigate('/main')}
				className='hidden h-10 items-center gap-2.5 rounded-xl px-2 transition-colors hover:bg-white/60 lg:inline-flex'
			>
				<img src={logoSymbol} alt='' className='h-6 w-6' />
				<span className='text-xl leading-none text-main-deep-blue' style={{ fontFamily: 'RixInooAriDuri' }}>
					IEUM
				</span>
			</button>

			{/* 데스크탑: 브레드크럼 pill */}
			<div className='hidden items-center gap-1 lg:flex'>
				<ChevronRight size={15} className='text-main-gray' />
				<span className='inline-flex h-7 items-center rounded-full bg-main-deep-blue px-3 text-xs font-semibold text-white'>
					{crumb}
				</span>
			</div>

			<div className='flex-1' />

			{/* 우측 */}
			<div className='flex items-center gap-2'>
				{/* 검색 pill (데스크탑) */}
				<button
					type='button'
					className='hidden h-9 min-w-[200px] items-center gap-2.5 rounded-full border border-[#cde9f4] bg-white/70 pl-3.5 pr-2.5 text-[13px] text-main-deep-blue transition-colors hover:bg-white/90 lg:inline-flex'
				>
					<Search size={15} className='shrink-0' />
					<span className='flex-1 text-left opacity-70'>찾기 · 명령</span>
					<span className='rounded-md border border-[#cde9f4] bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold opacity-80'>
						⌘K
					</span>
				</button>

				{/* 알림 */}
				<button
					type='button'
					onClick={onNotifications}
					aria-label='알림'
					className='relative flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[#cde9f4] bg-white/60 text-main-deep-blue transition-colors hover:bg-white'
				>
					<Bell size={18} />
					{hasNotifications && (
						<span className='absolute right-1.5 top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border-2 border-[#EAF7FE] bg-node-orange px-0.5 text-[8px] font-bold text-white'>
							{notificationCount}
						</span>
					)}
				</button>

				{/* 유저 아바타 */}
				<div className='flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-main-deep-blue text-[13px] font-bold text-white shadow-[0_0_0_2px_var(--color-sub-blue)]'>
					{initial}
				</div>
			</div>
		</header>
	)
}
