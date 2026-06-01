import { useQuery } from '@tanstack/react-query'
import { getWorkflow } from '@/api/workflow'
import { queryKeys } from '@/constants/queryKeys'

export const useWorkflowQuery = (id: string | undefined) =>
	useQuery({
		queryKey: queryKeys.workflows.detail(id ?? ''),
		queryFn: () => getWorkflow(id!),
		enabled: !!id,
	})
