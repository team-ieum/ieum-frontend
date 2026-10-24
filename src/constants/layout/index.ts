import { LayoutDashboard, Workflow, Blocks, UserRoundCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SidebarNavId = 'dashboard' | 'canvas' | 'refs' | 'settings'

export type NavItem = {
	id: SidebarNavId
	icon: LucideIcon
	label: string
	path: string
}

export const NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: '/main' },
	{ id: 'canvas', icon: Workflow, label: '워크플로우', path: '/workflow' },
	{ id: 'refs', icon: Blocks, label: '통합 설정', path: '/inter-setting' },
	{ id: 'settings', icon: UserRoundCog, label: '계정 설정', path: '/user' },
]

/** 사이드바가 고정 표시되는 viewport 조건. `src/styles/tokens.css`의 `--breakpoint-lg`(Tailwind `lg:`)와 같은 값을 유지해야 한다. */
export const SIDEBAR_DOCKED_MEDIA_QUERY = '(min-width: 46.5rem)'

export const SIDEBAR_ELEMENT_ID = 'app-sidebar'
