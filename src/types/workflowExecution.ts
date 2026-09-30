export type ExecutionEventType = 'NODE_STARTED' | 'NODE_COMPLETED' | 'NODE_FAILED' | 'APPROVAL_REQUESTED' | 'EXECUTION_COMPLETED'

export type NodeExecutionStatus = 'running' | 'success' | 'failed' | 'waitingApproval' | 'skipped'

// 백엔드 BE-35 SSE data 페이로드 (null 필드는 직렬화 제외됨)
export interface ExecutionEvent {
	type: ExecutionEventType
	workflowId: string
	executionId: string
	occurredAt: string
	nodeId?: string
	nodeType?: string
	status?: string
	durationMs?: number
	errorMessage?: string
	executionStatus?: string
}
