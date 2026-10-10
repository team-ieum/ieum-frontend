import { useUpdateWorkflowMutation } from '@/hooks/workflow/mutations/useUpdateWorkflowMutation'
import { useModalStore } from '@/stores/useModalStore'
import { isApiError } from '@/utils/ApiError'
import { removeWorkflowDraft, type WorkflowDraftData } from '@/utils/workflow/workflowDraftStorage'

type UseWorkflowSaveOptions = {
	workflowId: string
	description?: string
	document: WorkflowDraftData | null
	hasUnsavedChanges: boolean
}

export const useWorkflowSave = ({ workflowId, description, document, hasUnsavedChanges }: UseWorkflowSaveOptions) => {
	const openModal = useModalStore(state => state.open)
	const updateMutation = useUpdateWorkflowMutation(workflowId)
	const isSaving = updateMutation.isPending
	const canSave = Boolean(workflowId && document && hasUnsavedChanges && !isSaving)

	const handleSave = async () => {
		if (!canSave || !document) return
		const name = document.title.trim()
		if (!name) {
			openModal('저장 오류', '워크플로우 이름을 입력해주세요.')
			return
		}

		try {
			await updateMutation.mutateAsync({ name, description, nodes: document.nodes, edges: document.edges })
			removeWorkflowDraft(workflowId)
		} catch (error) {
			openModal('저장 오류', isApiError(error) ? error.message : '워크플로우 저장에 실패했어요. 다시 시도해주세요.')
		}
	}

	return { handleSave, isSaving, canSave }
}
