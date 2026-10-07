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
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.workflows.all(), 'list'] })
		},
	})
}
