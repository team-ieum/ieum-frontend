import { create } from 'zustand'
import type { NodeExecutionStatus } from '@/types/workflowExecution'

export type WorkflowExecutionPhase =
	| 'requesting'
	| 'running'
	| 'success'
	| 'failed'
	| 'waitingApproval'
	| 'interrupted'
	| 'requestFailed'

export interface WorkflowExecutionState {
	requestId: number
	executionId: string | null
	phase: WorkflowExecutionPhase
	nodeStatus: Record<string, NodeExecutionStatus>
	errorMessage: string | null
}

interface ExecutionState {
	executions: Partial<Record<string, WorkflowExecutionState>>
	begin: (workflowId: string, requestId: number) => void
	attach: (workflowId: string, requestId: number, executionId: string) => void
	setNodeStatus: (workflowId: string, requestId: number, nodeId: string, status: NodeExecutionStatus) => void
	finish: (
		workflowId: string,
		requestId: number,
		phase: Extract<WorkflowExecutionPhase, 'success' | 'failed' | 'waitingApproval' | 'interrupted' | 'requestFailed'>,
		errorMessage?: string
	) => void
	resetAll: () => void
}

/** 워크플로우별 마지막 실행 상태를 탭 메모리에 보관한다. 요청 번호가 다른 늦은 결과는 무시한다. */
export const useExecutionStore = create<ExecutionState>(set => ({
	executions: {},
	begin: (workflowId, requestId) =>
		set(state => ({
			executions: {
				...state.executions,
				[workflowId]: { requestId, executionId: null, phase: 'requesting', nodeStatus: {}, errorMessage: null },
			},
		})),
	attach: (workflowId, requestId, executionId) =>
		set(state => {
			const current = state.executions[workflowId]
			if (current?.requestId !== requestId || current.phase !== 'requesting') return state
			return {
				executions: {
					...state.executions,
					[workflowId]: { ...current, executionId, phase: 'running' },
				},
			}
		}),
	setNodeStatus: (workflowId, requestId, nodeId, status) =>
		set(state => {
			const current = state.executions[workflowId]
			if (current?.requestId !== requestId || current.phase !== 'running') return state
			const previous = current.nodeStatus[nodeId]
			if (previous === 'success' || previous === 'failed' || previous === 'skipped') {
				if (status === 'running') return state
			}
			return {
				executions: {
					...state.executions,
					[workflowId]: { ...current, nodeStatus: { ...current.nodeStatus, [nodeId]: status } },
				},
			}
		}),
	finish: (workflowId, requestId, phase, errorMessage) =>
		set(state => {
			const current = state.executions[workflowId]
			if (current?.requestId !== requestId) return state
			if (current.phase !== 'requesting' && current.phase !== 'running') return state
			return {
				executions: {
					...state.executions,
					[workflowId]: { ...current, phase, errorMessage: errorMessage ?? null },
				},
			}
		}),
	resetAll: () => set({ executions: {} }),
}))
