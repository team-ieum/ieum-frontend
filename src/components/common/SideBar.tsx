import { FocusTrap } from 'focus-trap-react'
import { ChevronLeft, ChevronRight, HelpCircle, MoreHorizontal, Settings, Sparkles, X } from 'lucide-react'
import type { Ref } from 'react'
import { Link } from 'react-router'
import { cn } from '@/utils/cn'
import { NAV_ITEMS, SIDEBAR_ELEMENT_ID } from '@/constants/layout'
import { useSidebarRouteDataPrefetch } from '@/hooks/layout/useSidebarRouteDataPrefetch'
import { useSidebarViewModel } from '@/hooks/layout/useSidebarViewModel'

type SideBarProps = {
	isOpen?: boolean
	/** 좁은 viewport에서 화면 밖에 있을 때 true. 이때 사이드바 전체를 `inert`로 렌더한다. */
	isOffCanvasHidden?: boolean
	/** 좁은 viewport에서 열려 있을 때 true. 이때 focus를 사이드바 안에 가둔다. */
	isModalOpen?: boolean
	closeButtonRef?: Ref<HTMLButtonElement>
	/** 항목을 선택해 `pathname`으로 이동하며 닫는다. */
	onSelect?: (pathname: string) => void
	/** 닫기 버튼으로 닫고 메뉴 버튼으로 focus를 되돌린다. */
	onDismiss?: () => void
	collapsed?: boolean
	onToggleCollapse?: () => void
	onLogout?: () => void
}

const NAV_ICON_BY_ID = Object.fromEntries(NAV_ITEMS.map(item => [item.id, item.icon])) as Record<
	(typeof NAV_ITEMS)[number]['id'],
	(typeof NAV_ITEMS)[number]['icon']
>

export const SideBar = ({
	isOpen = false,
	isOffCanvasHidden = false,
	isModalOpen = false,
	closeButtonRef,
	onSelect,
	onDismiss,
	collapsed = false,
	onToggleCollapse,
	onLogout,
}: SideBarProps) => {
	const { navItems, recentWorkflows, isRecentWorkflowsLoading, onCreateCanvasClick, onRecentWorkflowClick } =
		useSidebarViewModel({ onSelect })
	const prefetchRouteData = useSidebarRouteDataPrefetch()

	return (
		<FocusTrap
			active={isModalOpen}
			// 초기 focus, Escape, 닫힌 뒤 focus 복원은 useMobileSidebar가 소유하고 여기서는 Tab 순환만 맡는다.
			focusTrapOptions={{
				initialFocus: false,
				escapeDeactivates: false,
				returnFocusOnDeactivate: false,
				allowOutsideClick: true,
			}}
		>
			<aside
				id={SIDEBAR_ELEMENT_ID}
				inert={isOffCanvasHidden}
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
						ref={closeButtonRef}
						type='button'
						onClick={onDismiss}
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
						onClick={onCreateCanvasClick}
						aria-label={collapsed ? '새 캔버스' : undefined}
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
				<nav aria-label='주요 메뉴' className='flex flex-col gap-0.5 px-3'>
					{navItems.map(item => {
						const Icon = NAV_ICON_BY_ID[item.id]

						return (
							<Link
								key={item.id}
								to={item.path}
								aria-current={item.isActive ? 'page' : undefined}
								aria-label={collapsed ? item.label : undefined}
								onPointerEnter={() => prefetchRouteData(item.id)}
								onFocus={() => prefetchRouteData(item.id)}
								onClick={() => onSelect?.(item.path)}
								className={cn(
									'flex h-10 w-full items-center gap-2.5 rounded-xl text-sm transition-colors',
									collapsed ? 'justify-center' : 'px-3.5',
									item.isActive
										? 'bg-main-deep-blue font-semibold text-white shadow-[0_4px_12px_-4px_rgba(41,83,124,.4)]'
										: 'font-normal text-main-deep-blue hover:bg-white/50'
								)}
							>
								<Icon size={18} className={item.isActive ? 'text-white' : 'text-main-deep-blue/70'} />
								{!collapsed && (
									<>
										<span className='flex-1 text-left'>{item.label}</span>
										{item.dot && item.count == null && (
											<span className='h-1.5 w-1.5 rounded-full bg-node-orange' />
										)}
									</>
								)}
							</Link>
						)
					})}
				</nav>

				{/* 최근 작업 — 워크플로우 수정순 */}
				{!collapsed && (
					<div className='mt-5 min-h-0 px-3'>
						<div className='flex items-center justify-between px-3 pb-2'>
							<span className='text-[11px] font-semibold uppercase tracking-[.08em] text-main-gray'>최근 작업</span>
							<MoreHorizontal size={13} className='text-main-gray' />
						</div>
						<div className='flex flex-col'>
							{isRecentWorkflowsLoading ? (
								<p className='px-3 py-2 text-[12px] text-neutral-500'>불러오는 중…</p>
							) : recentWorkflows.length === 0 ? (
								<p className='px-3 py-2 text-[12px] text-neutral-500'>최근 워크플로우가 없습니다.</p>
							) : (
								recentWorkflows.map(workflow => (
									<button
										key={workflow.id}
										type='button'
										onClick={() => onRecentWorkflowClick(workflow)}
										className={cn(
											'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-white/50',
											workflow.isHighlighted
												? 'border border-[#cde9f4] bg-white/70'
												: 'border border-transparent'
										)}
									>
										<span className={cn('h-2 w-2 shrink-0 rounded-full', workflow.statusDotClass)} />
										<div className='min-w-0 flex-1'>
											<div className='truncate text-[13px] font-semibold text-neutral-800'>
												{workflow.name}
											</div>
											<div className='mt-0.5 text-[11px] text-neutral-500'>{workflow.updatedAtLabel}</div>
										</div>
									</button>
								))
							)}
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
		</FocusTrap>
	)
}
