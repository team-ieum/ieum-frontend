import { queryOptions } from '@tanstack/react-query'
import { getWorkflowNodeSample } from '@/api/nodeTest'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'
import { isApiError } from '@/utils/ApiError'

const MAX_RETRY_COUNT = 3

/**
 * 노드의 최신 테스트 샘플. 아직 테스트하지 않은 노드는 오류가 아니라 `null`이다.
 * 서버가 code로 답한 오류는 재시도해도 같으므로 네트워크 오류만 재시도한다.
 */
export const nodeTestSampleQueryOptions = (workflowId: string, nodeId: string) =>
	queryOptions({
		queryKey: queryKeys.nodeTestSamples.detail(workflowId, nodeId),
		queryFn: async () => {
			try {
				const response = await getWorkflowNodeSample(workflowId, nodeId)
				return response.data
			} catch (error) {
				if (isApiError(error) && error.code === 'TEST_SAMPLE_NOT_FOUND') return null
				throw error
			}
		},
		staleTime: QUERY_STALE_TIME_MS.nodeTestSample,
		retry: (failureCount, error) => !isApiError(error) && failureCount < MAX_RETRY_COUNT,
	})
