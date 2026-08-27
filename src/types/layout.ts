import type { WorkflowStatus } from '@/types/workflowList'

export type SidebarRecentWorkflowItem = {
	id: string
	name: string
	status: WorkflowStatus
	updatedAtLabel: string
}

export type SidebarViewModel = {
	recentWorkflows: SidebarRecentWorkflowItem[]
	isRecentWorkflowsLoading: boolean
	onRecentWorkflowClick: (workflow: SidebarRecentWorkflowItem) => void
}
