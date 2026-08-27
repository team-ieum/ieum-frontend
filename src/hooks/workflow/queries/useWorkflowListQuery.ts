import { useInfiniteQuery } from '@tanstack/react-query'
import { WORKFLOW_LIST_PAGE_SIZE, workflowListQueryOptions } from '@/hooks/workflow/queries/workflowListQueryOptions'

export const useWorkflowListQuery = (size = WORKFLOW_LIST_PAGE_SIZE) => useInfiniteQuery(workflowListQueryOptions(size))
