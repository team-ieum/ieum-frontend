import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { cn } from '../../utils/cn'
import { Header } from '../common/Header'
import { SideBar } from '../common/SideBar'
import { NAV_ITEMS } from '@/constants/layout'

export const Layout = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const [collapsed, setCollapsed] = useState(false)
	const { pathname } = useLocation()

	const closeSidebar = () => setIsSidebarOpen(false)
	const toggleSidebar = () => setIsSidebarOpen(prev => !prev)
	const toggleCollapse = () => setCollapsed(prev => !prev)

	const crumb = NAV_ITEMS.find(item => (item.path === '/main' ? pathname === '/main' : pathname.startsWith(item.path)))?.label

	return (
		<div className='min-h-screen bg-neutral-50 text-neutral-800'>
			<Header onMenuClick={toggleSidebar} crumb={crumb} />

			<SideBar isOpen={isSidebarOpen} onClose={closeSidebar} collapsed={collapsed} onToggleCollapse={toggleCollapse} />

			{isSidebarOpen && (
				<button
					type='button'
					className='fixed inset-0 top-(--layout-header-height) z-20 bg-black/30 lg:hidden'
					onClick={closeSidebar}
					aria-label='사이드바 배경 닫기'
				/>
			)}

			<main
				className={cn(
					'min-h-[calc(100vh-var(--layout-header-height))] w-full px-6 pb-6',
					'pt-[calc(var(--layout-header-height)+1.5rem)]',
					'transition-[padding-left] duration-200',
					collapsed ? 'lg:pl-22' : 'lg:pl-[calc(var(--layout-sidebar-width)+1.5rem)]'
				)}
			>
				<Outlet />
			</main>
		</div>
	)
}
