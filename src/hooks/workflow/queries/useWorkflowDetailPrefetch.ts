import { usePrefetchQuery } from '@tanstack/react-query'
import { workflowDetailQueryOptions } from '@/hooks/workflow/queries/workflowDetailQueryOptions'

/** 상세 query가 아직 없으면 렌더 중에 요청을 시작한다. 상세 page chunk를 기다리는 동안 상세 데이터를 병렬로 받을 때 쓴다. */
export const useWorkflowDetailPrefetch = (workflowId: string) => {
	usePrefetchQuery(workflowDetailQueryOptions(workflowId))
}
