import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateWorkflow } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'
import type { UpdateWorkflowRequest } from '@/types/workflow'

export const useUpdateWorkflowMutation = (workflowId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationKey: [...queryKeys.workflows.detail(workflowId), 'update'],
		scope: { id: `workflow-update-${workflowId}` },
		mutationFn: (body: UpdateWorkflowRequest) => updateWorkflow(workflowId, body),
		onSuccess: res => {
			queryClient.setQueryData(queryKeys.workflows.detail(workflowId), res)
			void queryClient.invalidateQueries({ queryKey: queryKeys.workflows.lists() })
			// 서버 검사는 저장된 버전만 보므로 저장 직후 다시 검사한다.
			void queryClient.invalidateQueries({ queryKey: queryKeys.workflowValidations.detail(workflowId) })
		},
	})
}
