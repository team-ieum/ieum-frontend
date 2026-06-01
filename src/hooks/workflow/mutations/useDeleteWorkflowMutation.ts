import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteWorkflow } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'

export const useDeleteWorkflowMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: deleteWorkflow,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all() })
		},
	})
}
