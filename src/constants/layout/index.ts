import { LayoutDashboard, Workflow, Blocks, UserRoundCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SidebarNavId } from '@/components/common/SideBar'

export type NavItem = {
	id: SidebarNavId
	icon: LucideIcon
	label: string
	path: string
	count?: number
	dot?: boolean
}

export type RecentItem = {
	name: string
	when: string
	dotClass: string
}

export type CollabAvatar = {
	className: string
	label: string
}

export const NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', icon: LayoutDashboard, label: '대시보드', path: '/main' },
	{ id: 'canvas', icon: Workflow, label: '워크플로우', path: '/workflow', count: 12 },
	{ id: 'refs', icon: Blocks, label: '통합 설정', path: '/inter-setting' },
	{ id: 'settings', icon: UserRoundCog, label: '계정 설정', path: '/user' },
]

export const RECENTS: RecentItem[] = [
	{ name: '아이디어 클러스터', when: '방금 전', dotClass: 'bg-main-blue' },
	{ name: '카피 드래프트 v3', when: '17분 전', dotClass: 'bg-node-green' },
	{ name: '레퍼런스 — 봄 캠페인', when: '오늘', dotClass: 'bg-node-orange' },
	{ name: '뉴스레터 5월호', when: '어제', dotClass: 'bg-sub-blue' },
]

export const COLLAB_AVATARS: CollabAvatar[] = [
	{ className: 'bg-node-yellow', label: '소' },
	{ className: 'bg-sub-blue', label: '준' },
	{ className: 'bg-node-orange', label: 'M' },
]
