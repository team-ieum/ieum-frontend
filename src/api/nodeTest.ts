import { api } from '@/utils/AxiosInstance'
import type { NodeTestRequest, NodeTestResponse } from '@/types/nodeTest'

const getNodePath = (workflowId: string, nodeId: string) =>
	`/api/v1/workflows/${encodeURIComponent(workflowId)}/nodes/${encodeURIComponent(nodeId)}`

/** 노드를 실제로 실행해 결과를 최신 샘플로 남긴다. 실행 실패도 오류가 아니라 `status: FAILED`로 온다. */
export const testWorkflowNode = async (workflowId: string, nodeId: string, body: NodeTestRequest): Promise<NodeTestResponse> => {
	const response = await api.post(`${getNodePath(workflowId, nodeId)}/test`, body)
	return response.data
}

/** 노드의 최신 샘플. 샘플이 없으면 404 `TEST_SAMPLE_NOT_FOUND`로 실패한다. */
export const getWorkflowNodeSample = async (workflowId: string, nodeId: string): Promise<NodeTestResponse> => {
	const response = await api.get(`${getNodePath(workflowId, nodeId)}/sample`)
	return response.data
}
