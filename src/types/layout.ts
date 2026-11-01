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
	/** '새 캔버스'로 빈 워크플로우를 만드는 요청이 진행 중이다. */
	isCreatingCanvas: boolean
	onCreateCanvasClick: () => void
	onRecentWorkflowClick: (workflow: SidebarRecentWorkflowItem) => void
}
