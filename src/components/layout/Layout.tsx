import { useState } from 'react'
import { Outlet } from 'react-router'
import { Header } from '../common/Header'

export const Layout = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)

	const closeSidebar = () => setIsSidebarOpen(false)
	const toggleSidebar = () => setIsSidebarOpen(prev => !prev)

	return (
		<div className='min-h-screen bg-neutral-50 text-neutral-800'>
			<Header onMenuClick={toggleSidebar} />

			<div className='pt-(--layout-header-height)'>
				<aside
					className={`fixed top-(--layout-header-height) left-0 z-30 h-[calc(100vh-var(--layout-header-height))] w-(--layout-sidebar-width) border-r border-neutral-200 bg-neutral-white p-4 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
					aria-label='사이드바'
				>
					<div className='mb-4 flex items-center justify-between lg:hidden'>
						<strong className='text-neutral-800'>메뉴</strong>
						<button
							type='button'
							onClick={closeSidebar}
							className='flex h-8 w-8 items-center justify-center rounded-brand-sm border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
							aria-label='사이드바 닫기'
						>
							<span aria-hidden='true'>✕</span>
						</button>
					</div>
					<nav className='space-y-2 text-sm text-neutral-700'>
						<div className='rounded-brand-sm bg-neutral-100 px-3 py-2'>대시보드</div>
						<div className='rounded-brand-sm px-3 py-2'>메뉴 1</div>
						<div className='rounded-brand-sm px-3 py-2'>메뉴 2</div>
					</nav>
				</aside>

				{isSidebarOpen && (
					<button
						type='button'
						className='fixed inset-0 top-(--layout-header-height) z-20 bg-black/30 lg:hidden'
						onClick={closeSidebar}
						aria-label='사이드바 배경 닫기'
					/>
				)}

				<main className='mx-auto min-h-[calc(100vh-var(--layout-header-height))] w-full max-w-(--layout-content-max-width) px-4 py-6 lg:pl-[calc(var(--layout-sidebar-width)+1.5rem)]'>
					<Outlet />
				</main>
			</div>
		</div>
	)
}
