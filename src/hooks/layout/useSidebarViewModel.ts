import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { NAV_ITEMS } from '@/constants/layout'
import { WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import type { SidebarRecentWorkflowItem, SidebarViewModel } from '@/types/layout'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { mapWorkflowDtoToListItem } from '@/utils/workflow/mapWorkflowDtoToListItem'

const RECENT_LIMIT = 5

type UseSidebarViewModelOptions = {
	onClose?: () => void
}

const isPathActive = (pathname: string, path: string): boolean => pathname === path || pathname.startsWith(`${path}/`)

export const useSidebarViewModel = ({ onClose }: UseSidebarViewModelOptions = {}): SidebarViewModel => {
	const navigate = useNavigate()
	const { pathname } = useLocation()
	const { data, isLoading } = useWorkflowListQuery()

	const navItems = useMemo(
		() =>
			NAV_ITEMS.map(item => ({
				id: item.id,
				label: item.label,
				path: item.path,
				isActive: isPathActive(pathname, item.path),
				dot: item.dot,
				count: item.count,
			})),
		[pathname]
	)

	const recentWorkflows = useMemo((): SidebarRecentWorkflowItem[] => {
		const workflows = (data?.pages ?? []).flatMap(page => page.data.content.map(mapWorkflowDtoToListItem))

		return [...workflows]
			.sort((a, b) => {
				const aTime = new Date(a.updatedAt ?? a.lastRun).getTime()
				const bTime = new Date(b.updatedAt ?? b.lastRun).getTime()
				return bTime - aTime
			})
			.slice(0, RECENT_LIMIT)
			.map((workflow, index) => {
				const isCurrent = pathname === `/workflow/${workflow.id}`

				return {
					id: workflow.id,
					name: workflow.name,
					statusDotClass: WORKFLOW_STATUS_META[workflow.status].dotBgClass,
					updatedAtLabel: formatRelativeTime(workflow.updatedAt ?? workflow.lastRun),
					isHighlighted: index === 0 || isCurrent,
				}
			})
	}, [data, pathname])

	const onNavItemClick = useCallback(
		(path: string) => {
			navigate(path)
			onClose?.()
		},
		[navigate, onClose]
	)

	const onCreateCanvasClick = useCallback(() => {
		navigate('/workflow/new')
		onClose?.()
	}, [navigate, onClose])

	const onRecentWorkflowClick = useCallback(
		(workflow: SidebarRecentWorkflowItem) => {
			navigate(`/workflow/${workflow.id}`, { state: { name: workflow.name } })
			onClose?.()
		},
		[navigate, onClose]
	)

	return {
		navItems,
		recentWorkflows,
		isRecentWorkflowsLoading: isLoading,
		onNavItemClick,
		onCreateCanvasClick,
		onRecentWorkflowClick,
	}
}
