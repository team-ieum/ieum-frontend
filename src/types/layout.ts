import type { SidebarNavId } from '@/constants/layout'

type SidebarNavItemView = {
	id: SidebarNavId
	label: string
	path: string
	isActive: boolean
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
	onCreateCanvasClick: () => void
	onRecentWorkflowClick: (workflow: SidebarRecentWorkflowItem) => void
}
