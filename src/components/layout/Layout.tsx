import { useState } from 'react'
import { useLocation } from 'react-router'
import { cn } from '../../utils/cn'
import { Header } from '../common/Header'
import { SideBar } from '../common/SideBar'
import { NAV_ITEMS } from '@/constants/layout'
import { RouteTransition } from '@/components/routing/RouteTransition'
import { useMobileSidebar } from '@/hooks/layout/useMobileSidebar'

export const Layout = () => {
	const sidebar = useMobileSidebar()
	const [collapsed, setCollapsed] = useState(false)
	const { pathname } = useLocation()

	const toggleCollapse = () => setCollapsed(prev => !prev)

	const crumb = NAV_ITEMS.find(item => {
		return pathname === item.path || pathname.startsWith(`${item.path}/`)
	})?.label

	return (
		<div className='min-h-screen bg-neutral-50 text-neutral-800'>
			<Header
				onMenuClick={sidebar.toggle}
				menuButtonRef={sidebar.menuButtonRef}
				isSidebarOpen={sidebar.isOpen}
				crumb={crumb}
			/>

			<SideBar
				isOpen={sidebar.isOpen}
				isOffCanvasHidden={sidebar.isOffCanvasHidden}
				closeButtonRef={sidebar.closeButtonRef}
				onClose={sidebar.close}
				onDismiss={sidebar.dismiss}
				collapsed={collapsed}
				onToggleCollapse={toggleCollapse}
			/>

			{sidebar.isOpen && (
				<button
					type='button'
					className='fixed inset-0 top-(--layout-header-height) z-20 bg-black/30 lg:hidden'
					onClick={sidebar.dismiss}
					aria-label='사이드바 배경 닫기'
				/>
			)}

			<main
				className={cn(
					'relative min-h-[calc(100vh-var(--layout-header-height))] w-full px-6 pb-6',
					'pt-[calc(var(--layout-header-height)+1.5rem)]',
					'transition-[padding-left] duration-200',
					collapsed ? 'lg:pl-22' : 'lg:pl-[calc(var(--layout-sidebar-width)+1.5rem)]'
				)}
			>
				<RouteTransition />
			</main>
		</div>
	)
}
