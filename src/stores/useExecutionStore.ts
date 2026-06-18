import { create } from 'zustand'
import type { NodeExecutionStatus } from '@/types/workflowExecution'

interface ExecutionState {
	isExecuting: boolean
	executionId: string | null
	/** nodeId → 실행 상태. 미포함 노드는 대기(pending) 취급 */
	nodeStatus: Record<string, NodeExecutionStatus>
	start: (executionId: string) => void
	setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void
	finish: () => void
	reset: () => void
}

export const useExecutionStore = create<ExecutionState>(set => ({
	isExecuting: false,
	executionId: null,
	nodeStatus: {},
	start: executionId => set({ isExecuting: true, executionId, nodeStatus: {} }),
	setNodeStatus: (nodeId, status) => set(state => ({ nodeStatus: { ...state.nodeStatus, [nodeId]: status } })),
	finish: () => set({ isExecuting: false }),
	reset: () => set({ isExecuting: false, executionId: null, nodeStatus: {} }),
}))
