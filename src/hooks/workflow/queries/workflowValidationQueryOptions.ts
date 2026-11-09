import { queryOptions } from '@tanstack/react-query'
import { validateWorkflow } from '@/api/workflow'
import { QUERY_STALE_TIME_MS } from '@/constants/queryCache'
import { queryKeys } from '@/constants/queryKeys'

/**
 * 서버에 저장된 최신 버전의 정적 검사 결과.
 * 화면을 열 때마다 다시 검사하고(`staleTime` 0), 저장 성공 시 `useUpdateWorkflowMutation`이 무효화한다.
 * 검사 요청이 실패해도 이전 결과(data)는 유지되어 화면 표시를 지우지 않는다.
 */
export const workflowValidationQueryOptions = (workflowId: string) =>
	queryOptions({
		queryKey: queryKeys.workflowValidations.detail(workflowId),
		queryFn: async () => {
			const response = await validateWorkflow(workflowId)
			return response.data
		},
		staleTime: QUERY_STALE_TIME_MS.workflowValidation,
		// POST 검사라 창 포커스마다 다시 보내지 않고, 실패는 칩의 '다시 검사'로 사용자가 다시 시도한다.
		refetchOnWindowFocus: false,
		retry: false,
		// 검사할 때마다 새 결과 객체를 만들어, 실행 400으로 반영한 결과가 다음 검사 결과로 바뀌었는지 참조로 가린다.
		structuralSharing: false,
	})
