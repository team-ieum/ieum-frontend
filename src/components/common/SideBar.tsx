import { useNavigate, useLocation } from 'react-router'
import { ChevronLeft, ChevronRight, HelpCircle, MoreHorizontal, Settings, Sparkles, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { NAV_ITEMS, RECENTS } from '@/constants/layout'

export type SidebarNavId = 'dashboard' | 'canvas' | 'refs' | 'settings'

type SideBarProps = {
	isOpen?: boolean
	onClose?: () => void
	collapsed?: boolean
	onToggleCollapse?: () => void
	onLogout?: () => void
}

export const SideBar = ({ isOpen = false, onClose, collapsed = false, onToggleCollapse, onLogout }: SideBarProps) => {
	const navigate = useNavigate()
	const { pathname } = useLocation()
	return (
		<aside
			className={cn(
				'fixed top-(--layout-header-height) left-0 z-30',
				'flex h-[calc(100vh-var(--layout-header-height))] flex-col',
				'border-r border-[#cde9f4] bg-main-light-blue',
				'transition-[transform,width] duration-200',
				collapsed ? 'w-16' : 'w-(--layout-sidebar-width)',
				isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
			)}
			aria-label='사이드바'
		>
			{/* 모바일 닫기 */}
			<div className='flex items-center justify-between px-4 pt-4 pb-2 lg:hidden'>
				<span className='text-sm font-semibold text-main-deep-blue'>메뉴</span>
				<button
					type='button'
					onClick={onClose}
					className='flex h-8 w-8 items-center justify-center rounded-brand-sm border border-[#cde9f4] bg-white text-main-deep-blue transition-colors hover:bg-white/80'
					aria-label='사이드바 닫기'
				>
					<X size={16} />
				</button>
			</div>

			{/* 새 캔버스 CTA */}
			<div className='p-3.5'>
				<button
					type='button'
					className={cn(
						'flex h-[42px] w-full items-center rounded-xl bg-main-deep-blue text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(41,83,124,.5)] transition-colors hover:bg-main-deep-blue/90',
						collapsed ? 'justify-center' : 'justify-between px-3.5'
					)}
				>
					<span className='inline-flex items-center gap-2'>
						<Sparkles size={16} />
						{!collapsed && '새 캔버스'}
					</span>
					{!collapsed && (
						<span className='rounded-md bg-white/12 px-1.5 py-0.5 font-mono text-[11px] font-medium opacity-70'>
							N
						</span>
					)}
				</button>
			</div>

			{/* 네비게이션 */}
			<nav className='flex flex-col gap-0.5 px-3'>
				{NAV_ITEMS.map(item => {
					const Icon = item.icon
					const isActive = item.path === '/main' ? pathname === '/main' : pathname.startsWith(item.path)
					return (
						<button
							key={item.id}
							type='button'
							onClick={() => {
								navigate(item.path)
								onClose?.()
							}}
							className={cn(
								'flex h-10 w-full items-center gap-2.5 rounded-xl text-sm transition-colors',
								collapsed ? 'justify-center' : 'px-3.5',
								isActive
									? 'bg-main-deep-blue font-semibold text-white shadow-[0_4px_12px_-4px_rgba(41,83,124,.4)]'
									: 'font-normal text-main-deep-blue hover:bg-white/50'
							)}
						>
							<Icon size={18} className={isActive ? 'text-white' : 'text-main-deep-blue/70'} />
							{!collapsed && (
								<>
									<span className='flex-1 text-left'>{item.label}</span>
									{item.count != null && (
										<span
											className={cn(
												'rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none',
												isActive ? 'bg-white/18 text-white' : 'bg-main-blue/10 text-main-blue'
											)}
										>
											{item.count}
										</span>
									)}
									{item.dot && item.count == null && (
										<span className='h-1.5 w-1.5 rounded-full bg-node-orange' />
									)}
								</>
							)}
						</button>
					)
				})}
			</nav>

			{/* 최근 작업 */}
			{!collapsed && (
				<div className='mt-5 px-3'>
					<div className='flex items-center justify-between px-3 pb-2'>
						<span className='text-[11px] font-semibold uppercase tracking-[.08em] text-main-gray'>최근 작업</span>
						<MoreHorizontal size={13} className='text-main-gray' />
					</div>
					<div className='flex flex-col'>
						{RECENTS.map((r, i) => (
							<button
								key={i}
								type='button'
								className={cn(
									'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-white/50',
									i === 0 ? 'border border-[#cde9f4] bg-white/70' : 'border border-transparent'
								)}
							>
								<span className={`h-2 w-2 shrink-0 rounded-full ${r.dotClass}`} />
								<div className='min-w-0 flex-1'>
									<div className='truncate text-[13px] font-semibold text-neutral-800'>{r.name}</div>
									<div className='mt-0.5 text-[11px] text-neutral-500'>{r.when}</div>
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			<div className='flex-1' />

			{/* 태그라인 카드 */}
			{!collapsed && (
				<div className='relative m-3 overflow-hidden rounded-xl bg-main-deep-blue p-3.5 text-white'>
					<span className='absolute -right-5 -top-5 h-[90px] w-[90px] rounded-full bg-sub-blue/35' />
					<span className='absolute right-[18px] -bottom-[18px] h-[50px] w-[50px] rounded-full bg-node-yellow/50' />
					<div className='relative text-lg leading-snug'>
						모든 창작자를
						<br />
						잇는 연결.
					</div>
					<div className='relative mt-2.5 text-[11px] font-medium opacity-75'>IEUM beta · v0.0.1</div>
				</div>
			)}

			{/* 푸터 */}
			<div className='flex gap-1.5 border-t border-[#cde9f4] bg-white/40 p-3'>
				{!collapsed && (
					<>
						<button
							type='button'
							className={cn(
								'inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#cde9f4] bg-white text-sm font-semibold text-main-deep-blue transition-colors hover:bg-neutral-50',
								collapsed ? 'w-9 shrink-0' : 'flex-1'
							)}
							aria-label='도움말'
						>
							<HelpCircle size={15} />
							{!collapsed && '도움말'}
						</button>
						<button
							type='button'
							onClick={onLogout}
							className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#cde9f4] bg-white text-main-deep-blue transition-colors hover:bg-neutral-50'
							aria-label='설정'
						>
							<Settings size={15} />
						</button>
					</>
				)}
				<button
					type='button'
					onClick={onToggleCollapse}
					className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#cde9f4] bg-white text-main-deep-blue transition-colors hover:bg-neutral-50'
					aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
				>
					{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
				</button>
			</div>
		</aside>
	)
}
