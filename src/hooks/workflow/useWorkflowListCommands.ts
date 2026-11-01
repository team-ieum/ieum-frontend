import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useDeleteWorkflowMutation } from '@/hooks/workflow/mutations/useDeleteWorkflowMutation'
import { useCreateBlankWorkflow } from '@/hooks/workflow/useCreateBlankWorkflow'
import { useModalStore } from '@/stores/useModalStore'
import type { WorkflowListViewModel } from '@/types/workflowList'
import { isApiError } from '@/utils/ApiError'

type WorkflowListCommands = Pick<WorkflowListViewModel, 'handleCreateWorkflow' | 'handleOpenWorkflow' | 'handleDeleteWorkflow'>

export const useWorkflowListCommands = (): WorkflowListCommands => {
	const navigate = useNavigate()
	const openModal = useModalStore(state => state.open)
	const { createBlankWorkflow } = useCreateBlankWorkflow()
	const deleteMutation = useDeleteWorkflowMutation()

	const handleCreateWorkflow = useCallback(() => createBlankWorkflow(), [createBlankWorkflow])

	const handleOpenWorkflow = useCallback(
		(workflowId: string, workflowName: string) => {
			navigate(`/workflow/${workflowId}`, { state: { name: workflowName } })
		},
		[navigate]
	)

	const handleDeleteWorkflow = useCallback(
		async (workflowId: string) => {
			try {
				await deleteMutation.mutateAsync(workflowId)
			} catch (err) {
				openModal('삭제 오류', isApiError(err) ? err.message : '워크플로우 삭제에 실패했어요. 다시 시도해주세요.')
			}
		},
		[deleteMutation, openModal]
	)

	return { handleCreateWorkflow, handleOpenWorkflow, handleDeleteWorkflow }
}
