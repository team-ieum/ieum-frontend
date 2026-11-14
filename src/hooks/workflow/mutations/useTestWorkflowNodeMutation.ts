import { useMutation, useQueryClient } from '@tanstack/react-query'
import { testWorkflowNode } from '@/api/nodeTest'
import { queryKeys } from '@/constants/queryKeys'
import type { WorkflowNodeDto } from '@/types/workflowList'

type TestWorkflowNodeVariables = {
	node: WorkflowNodeDto
	/** `manual.run` 테스트 입력. 서버는 다른 노드의 입력을 무시한다. 없으면 보내지 않는다. */
	input?: Record<string, unknown>
}

/**
 * 편집 중인 노드를 실제로 실행한다.
 * 서버는 SUCCESS·FAILED 결과를 그 노드의 최신 샘플로 저장하므로 같은 결과로 샘플 캐시를 바로 맞춘다.
 */
export const useTestWorkflowNodeMutation = (workflowId: string) => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ node, input }: TestWorkflowNodeVariables) =>
			testWorkflowNode(workflowId, node.id, input ? { node, input } : { node }),
		onSuccess: async (response, { node }) => {
			const result = response.data
			if (result.status === 'LISTENING') return
			const queryKey = queryKeys.nodeTestSamples.detail(workflowId, node.id)
			// 패널을 열 때 시작한 이전 샘플 조회가 늦게 끝나 새 결과를 덮지 않게 먼저 멈춘다.
			await queryClient.cancelQueries({ queryKey })
			queryClient.setQueryData(queryKey, result)
		},
	})
}
