import { LayoutDashboard, Workflow, Blocks, UserRoundCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { WORKFLOW_LIST } from '@/mocks/workflow/workflowListMock'

export type SidebarNavId = 'dashboard' | 'canvas' | 'refs' | 'settings'

export type NavItem = {
	id: SidebarNavId
	icon: LucideIcon
	label: string
	path: string
	count?: number
	dot?: boolean
}

export type CollabAvatar = {
	className: string
	label: string
}

export const NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: '/main' },
	{ id: 'canvas', icon: Workflow, label: '워크플로우', path: '/workflow', count: WORKFLOW_LIST.length },
	{ id: 'refs', icon: Blocks, label: '통합 설정', path: '/inter-setting' },
	{ id: 'settings', icon: UserRoundCog, label: '계정 설정', path: '/user' },
]

export const COLLAB_AVATARS: CollabAvatar[] = [
	{ className: 'bg-node-yellow', label: '소' },
	{ className: 'bg-sub-blue', label: '준' },
	{ className: 'bg-node-orange', label: 'M' },
]
