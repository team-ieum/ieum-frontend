import { useQuery } from '@tanstack/react-query'
import { workflowDetailQueryOptions } from '@/hooks/workflow/queries/workflowDetailQueryOptions'

export const useWorkflowQuery = (id: string | undefined) =>
	useQuery({
		...workflowDetailQueryOptions(id ?? ''),
		enabled: !!id,
	})
