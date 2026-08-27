import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkflow } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'

export const useCreateWorkflowMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: createWorkflow,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all() })
		},
	})
}
