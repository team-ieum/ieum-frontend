import type { WorkflowViewMode } from '@/types/workflowList'

const VIEW_PARAM = 'view'

export const parseWorkflowViewMode = (searchParams: URLSearchParams): WorkflowViewMode => {
	const viewParams = searchParams.getAll(VIEW_PARAM)
	return viewParams.length === 1 && viewParams[0] === 'row' ? 'row' : 'card'
}

export const serializeWorkflowViewMode = (searchParams: URLSearchParams, view: WorkflowViewMode): URLSearchParams => {
	const nextSearchParams = new URLSearchParams(searchParams)
	nextSearchParams.delete(VIEW_PARAM)
	if (view === 'row') {
		nextSearchParams.set(VIEW_PARAM, 'row')
	}
	return nextSearchParams
}

export const isCanonicalWorkflowViewParams = (searchParams: URLSearchParams): boolean => {
	const viewParams = searchParams.getAll(VIEW_PARAM)
	return viewParams.length === 0 || (viewParams.length === 1 && viewParams[0] === 'row')
}
