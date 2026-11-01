import type { ApiResponse } from '@/types/api'
import type { WorkflowNodeDto } from '@/types/workflowList'

/** `LISTENING`은 `webhook.catch`가 수신을 기다리는 중이라는 뜻이다. */
type NodeTestStatus = 'SUCCESS' | 'FAILED' | 'LISTENING'

/**
 * 노드 테스트 결과이자 노드의 최신 샘플. 값이 없는 필드는 응답에서 빠진다.
 * `testedAt`·`expiresAt`은 오프셋 없는 LocalDateTime 문자열(서버 시각)이다.
 */
export type NodeTestResult = {
	status: NodeTestStatus
	/** SUCCESS의 출력. 민감 키는 서버가 `***`로 가린다. */
	output?: Record<string, unknown>
	/** FAILED의 실패 문구 */
	error?: string
	testedAt?: string
	/** LISTENING 만료 시각 */
	expiresAt?: string
}

export type NodeTestRequest = {
	/** 편집 중인 노드. 없으면 서버가 저장된 최신 노드를 쓴다. `id`는 경로 nodeId와 같아야 한다. */
	node?: WorkflowNodeDto
	/** `manual.run` 테스트의 입력 페이로드 */
	input?: Record<string, unknown>
}

export type NodeTestResponse = ApiResponse<NodeTestResult>
