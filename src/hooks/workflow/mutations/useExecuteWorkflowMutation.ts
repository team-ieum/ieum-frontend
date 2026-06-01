import { useMutation } from '@tanstack/react-query'
import { executeWorkflow } from '@/api/workflow'
import type { ExecuteWorkflowRequest } from '@/types/workflow'

export const useExecuteWorkflowMutation = (workflowId: string) =>
	useMutation({
		mutationFn: (body: ExecuteWorkflowRequest | void) => executeWorkflow(workflowId, body ?? undefined),
	})
