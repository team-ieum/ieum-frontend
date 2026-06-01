import { useMutation, useQueryClient } from '@tanstack/react-query'
import { activateWorkflow, deactivateWorkflow } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'

export const useToggleWorkflowMutation = (workflowId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (active: boolean) => (active ? activateWorkflow(workflowId) : deactivateWorkflow(workflowId)),
		onSuccess: res => {
			queryClient.setQueryData(queryKeys.workflows.detail(workflowId), res)
		},
	})
}
