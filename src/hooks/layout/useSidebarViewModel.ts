import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import type { SidebarRecentWorkflowItem, SidebarViewModel } from '@/types/layout'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { mapWorkflowDtoToListItem } from '@/utils/workflow/mapWorkflowDtoToListItem'

const RECENT_LIMIT = 5

type UseSidebarViewModelOptions = {
	onClose?: () => void
}

export const useSidebarViewModel = ({ onClose }: UseSidebarViewModelOptions = {}): SidebarViewModel => {
	const navigate = useNavigate()
	const { data, isLoading } = useWorkflowListQuery()

	const recentWorkflows = useMemo((): SidebarRecentWorkflowItem[] => {
		const workflows = (data?.pages ?? []).flatMap(page => page.data.content.map(mapWorkflowDtoToListItem))

		return [...workflows]
			.sort((a, b) => {
				const aTime = new Date(a.updatedAt ?? a.lastRun).getTime()
				const bTime = new Date(b.updatedAt ?? b.lastRun).getTime()
				return bTime - aTime
			})
			.slice(0, RECENT_LIMIT)
			.map(workflow => ({
				id: workflow.id,
				name: workflow.name,
				status: workflow.status,
				updatedAtLabel: formatRelativeTime(workflow.updatedAt ?? workflow.lastRun),
			}))
	}, [data])

	const onRecentWorkflowClick = useCallback(
		(workflow: SidebarRecentWorkflowItem) => {
			navigate(`/workflow/${workflow.id}`, { state: { name: workflow.name } })
			onClose?.()
		},
		[navigate, onClose]
	)

	return {
		recentWorkflows,
		isRecentWorkflowsLoading: isLoading,
		onRecentWorkflowClick,
	}
}
