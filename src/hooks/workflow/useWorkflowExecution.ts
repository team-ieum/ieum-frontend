import { useCallback } from 'react'
import { executeWorkflowTracked } from '@/services/workflowExecutionManager'
import { useExecutionStore } from '@/stores/useExecutionStore'
import type { WorkflowExecutionPhase } from '@/stores/useExecutionStore'
import type { NodeExecutionStatus } from '@/types/workflowExecution'

const EMPTY_NODE_STATUS: Record<string, NodeExecutionStatus> = {}

/** 현재 workflow의 실행 상태만 구독하고 앱 수명의 실행 관리자에 시작을 요청한다. */
export const useWorkflowExecution = (workflowId: string) => {
	const execution = useExecutionStore(state => state.executions[workflowId])
	const execute = useCallback(() => executeWorkflowTracked(workflowId), [workflowId])
	const phase: WorkflowExecutionPhase | 'idle' = execution?.phase ?? 'idle'
	const isExecuting = phase === 'requesting' || phase === 'running'

	return {
		execute,
		phase,
		isExecuting,
		canExecute: !isExecuting && phase !== 'waitingApproval',
		nodeStatus: execution?.nodeStatus ?? EMPTY_NODE_STATUS,
		errorMessage: execution?.errorMessage ?? null,
		executionId: execution?.executionId ?? null,
		requestId: execution?.requestId ?? null,
	}
}
