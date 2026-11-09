import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'

export type GroupedWorkflowValidationErrors = {
	/** `nodeId`가 null인 워크플로우 전체 오류. */
	globalErrors: WorkflowValidationErrorDto[]
	errorsByNodeId: ReadonlyMap<string, WorkflowValidationErrorDto[]>
}

/** 검사 오류를 워크플로우 전체 오류와 노드별 오류로 나눈다. 순서는 서버 응답 순서를 따른다. */
export const groupWorkflowValidationErrors = (errors: WorkflowValidationErrorDto[]): GroupedWorkflowValidationErrors => {
	const globalErrors: WorkflowValidationErrorDto[] = []
	const errorsByNodeId = new Map<string, WorkflowValidationErrorDto[]>()
	for (const error of errors) {
		if (error.nodeId === null) {
			globalErrors.push(error)
			continue
		}
		const nodeErrors = errorsByNodeId.get(error.nodeId)
		if (nodeErrors) nodeErrors.push(error)
		else errorsByNodeId.set(error.nodeId, [error])
	}
	return { globalErrors, errorsByNodeId }
}
