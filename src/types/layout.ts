import type { SidebarNavId } from '@/constants/layout'

export type SidebarNavItemView = {
	id: SidebarNavId
	label: string
	path: string
	isActive: boolean
	dot?: boolean
	count?: number
}

export type SidebarRecentWorkflowItem = {
	id: string
	name: string
	statusDotClass: string
	updatedAtLabel: string
	isHighlighted: boolean
}

export type SidebarViewModel = {
	navItems: SidebarNavItemView[]
	recentWorkflows: SidebarRecentWorkflowItem[]
	isRecentWorkflowsLoading: boolean
	onNavItemClick: (path: string) => void
	onCreateCanvasClick: () => void
	onRecentWorkflowClick: (workflow: SidebarRecentWorkflowItem) => void
}
