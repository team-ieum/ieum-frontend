import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { NAV_ITEMS } from '@/constants/layout'
import { WORKFLOW_STATUS_META } from '@/constants/workflow/workflowList'
import { useCreateBlankWorkflow } from '@/hooks/workflow/useCreateBlankWorkflow'
import { useWorkflowListQuery } from '@/hooks/workflow/queries/useWorkflowListQuery'
import type { SidebarRecentWorkflowItem, SidebarViewModel } from '@/types/layout'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { mapWorkflowDtoToListItem } from '@/utils/workflow/mapWorkflowDtoToListItem'

const RECENT_LIMIT = 5

type UseSidebarViewModelOptions = {
	/** 항목을 선택해 `pathname`으로 이동할 때 호출한다. */
	onSelect?: (pathname: string) => void
}

const isPathActive = (pathname: string, path: string): boolean => pathname === path || pathname.startsWith(`${path}/`)

export const useSidebarViewModel = ({ onSelect }: UseSidebarViewModelOptions = {}): SidebarViewModel => {
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

	const { createBlankWorkflow, isCreating } = useCreateBlankWorkflow()
	// 모바일 사이드바는 onSelect로 닫히므로 생성에 실패하면 열어 둔 채 오류 모달을 보여 준다.
	const onCreateCanvasClick = useCallback(() => {
		void createBlankWorkflow(onSelect)
	}, [createBlankWorkflow, onSelect])

	const onRecentWorkflowClick = useCallback(
		(workflow: SidebarRecentWorkflowItem) => {
			const path = `/workflow/${workflow.id}`
			navigate(path, { state: { name: workflow.name } })
			onSelect?.(path)
		},
		[navigate, onSelect]
	)

	return {
		navItems,
		recentWorkflows,
		isRecentWorkflowsLoading: isLoading,
		isCreatingCanvas: isCreating,
		onCreateCanvasClick,
		onRecentWorkflowClick,
	}
}
