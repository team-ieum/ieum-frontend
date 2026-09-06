import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useCreateWorkflowMutation } from '@/hooks/workflow/mutations/useCreateWorkflowMutation'
import { useDeleteWorkflowMutation } from '@/hooks/workflow/mutations/useDeleteWorkflowMutation'
import { useModalStore } from '@/stores/useModalStore'
import type { WorkflowListViewModel } from '@/types/workflowList'
import { isApiError } from '@/utils/ApiError'

type WorkflowListCommands = Pick<WorkflowListViewModel, 'handleCreateWorkflow' | 'handleOpenWorkflow' | 'handleDeleteWorkflow'>

export const useWorkflowListCommands = (): WorkflowListCommands => {
	const navigate = useNavigate()
	const openModal = useModalStore(state => state.open)
	const createMutation = useCreateWorkflowMutation()
	const deleteMutation = useDeleteWorkflowMutation()

	const handleCreateWorkflow = useCallback(async () => {
		try {
			const res = await createMutation.mutateAsync({
				name: '새 워크플로우',
				nodes: [],
				edges: [],
				triggerType: 'MANUAL',
			})
			navigate(`/workflow/${res.data.id}`)
		} catch (err) {
			if (isApiError(err)) {
				openModal('오류', err.message)
			} else {
				openModal('오류', '워크플로우 생성에 실패했어요. 다시 시도해주세요.')
			}
		}
	}, [createMutation, navigate, openModal])

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
