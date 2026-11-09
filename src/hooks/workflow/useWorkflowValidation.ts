import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { workflowValidationQueryOptions } from '@/hooks/workflow/queries/workflowValidationQueryOptions'
import type {
	WorkflowRevalidateResult,
	WorkflowValidationErrorDto,
	WorkflowValidationResultDto,
	WorkflowValidationStatusView,
} from '@/types/workflowValidation'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { getWorkflowValidationFailure } from '@/utils/workflow/getWorkflowValidationFailure'
import { getWorkflowValidationStatusView } from '@/utils/workflow/getWorkflowValidationStatusView'
import { groupWorkflowValidationErrors } from '@/utils/workflow/groupWorkflowValidationErrors'

const EMPTY_ERRORS: WorkflowValidationErrorDto[] = []

type UseWorkflowValidationOptions = {
	/** 없으면 검사하지 않는다. */
	workflowId: string | undefined
	/** 편집 문서에 저장하지 않은 변경이 있는지. 결과가 '저장된 버전 기준'임을 알리는 데 쓴다. */
	hasUnsavedChanges: boolean
	/** 지금 서버에 저장된 문서의 노드. 검사 결과를 받는 시점의 값을 결과와 함께 기억한다. */
	serverNodes: WorkflowNodeDto[] | undefined
}

type UseWorkflowValidationResult = {
	globalErrors: WorkflowValidationErrorDto[]
	errorsByNodeId: ReadonlyMap<string, WorkflowValidationErrorDto[]>
	/**
	 * 지금 보여 주는 검사 결과를 받을 때 서버에 저장돼 있던 노드. 결과의 `field` index가 가리키는 버전이다.
	 * 저장 뒤 다시 검사가 실패하거나 진행 중이면 서버 문서는 새 버전이어도 이 값은 이전 결과의 버전을 유지한다.
	 */
	validatedNodes: WorkflowNodeDto[] | undefined
	/** 툴바 칩에 그릴 상태. 보여 줄 상태가 없으면 null. */
	statusView: WorkflowValidationStatusView | null
	handleRevalidate: () => void
	/** 화면 표시를 갱신하며 다시 검사하고 결과를 돌려준다. 활성화 전 확인에 쓴다. */
	revalidate: () => Promise<WorkflowRevalidateResult>
	/**
	 * 수동 실행 오류가 400 `WORKFLOW_VALIDATION_FAILED`면 그 검사 오류를 검사 결과로 반영한다. 다른 오류는 무시한다.
	 * 실행 요청 당시의 `workflowId`를 넘겨, 그 사이 다른 워크플로우로 옮겨도 엉뚱한 화면에 표시하지 않게 한다.
	 */
	applyExecutionError: (workflowId: string, error: unknown) => void
}

/**
 * 편집 화면의 서버 정적 검사 결과와 툴바 칩 상태를 관리한다.
 * 결과의 SSOT는 `workflowValidationQueryOptions` 캐시이며, 화면을 열 때·저장 직후·다시 검사할 때 갱신된다.
 * 결과는 다음 검사 결과가 올 때까지 유지하고, 편집 중에도 숨기지 않는다.
 */
export const useWorkflowValidation = ({
	workflowId,
	hasUnsavedChanges,
	serverNodes,
}: UseWorkflowValidationOptions): UseWorkflowValidationResult => {
	const queryClient = useQueryClient()
	const query = useQuery({ ...workflowValidationQueryOptions(workflowId ?? ''), enabled: Boolean(workflowId) })
	// 실행 400 문구는 그때 반영한 결과 객체에만 붙여, 다음 검사 결과가 오면(data 참조가 바뀌면) 숨긴다.
	const [executionFailure, setExecutionFailure] = useState<{
		workflowId: string
		message: string
		result: WorkflowValidationResultDto
	} | null>(null)

	// 검사 응답에는 버전 정보가 없어, 결과 객체가 바뀌는 렌더의 서버 문서를 그 결과의 출처로 기억한다.
	// 저장 성공 시 상세 캐시가 먼저 새 버전으로 바뀌고 검사 결과는 다시 받을 때까지 이전 객체로 남으므로 출처가 섞이지 않는다.
	const [validatedSnapshot, setValidatedSnapshot] = useState<{
		workflowId: string | undefined
		result: WorkflowValidationResultDto
		nodes: WorkflowNodeDto[] | undefined
	} | null>(null)
	const result = query.data
	if (result && (validatedSnapshot?.result !== result || validatedSnapshot.workflowId !== workflowId)) {
		setValidatedSnapshot({ workflowId, result, nodes: serverNodes })
	} else if (result && validatedSnapshot && !validatedSnapshot.nodes && serverNodes) {
		// 상세보다 검사 결과가 먼저 도착한 첫 진입에는 처음 받은 상세를 출처로 채운다.
		setValidatedSnapshot({ ...validatedSnapshot, nodes: serverNodes })
	}
	const validatedNodes =
		result && validatedSnapshot?.result === result && validatedSnapshot.workflowId === workflowId
			? validatedSnapshot.nodes
			: undefined

	const errors = query.data?.errors ?? EMPTY_ERRORS
	const { globalErrors, errorsByNodeId } = groupWorkflowValidationErrors(errors)
	const executionFailureMessage =
		executionFailure && executionFailure.workflowId === workflowId && executionFailure.result === query.data
			? executionFailure.message
			: null

	const revalidate = async (): Promise<WorkflowRevalidateResult> => {
		if (!workflowId) return { status: 'unavailable' }
		const result = await query.refetch()
		if (result.isError || !result.data) return { status: 'unavailable' }
		return { status: 'ok', errorCount: result.data.errors.length }
	}

	const applyExecutionError = (targetWorkflowId: string, error: unknown) => {
		const failure = getWorkflowValidationFailure(error)
		if (!failure) return
		const { queryKey } = workflowValidationQueryOptions(targetWorkflowId)
		const result: WorkflowValidationResultDto = { valid: false, errors: failure.errors }
		queryClient.setQueryData(queryKey, result)
		setExecutionFailure({ workflowId: targetWorkflowId, message: failure.message, result })
	}

	return {
		globalErrors,
		errorsByNodeId,
		validatedNodes,
		statusView: getWorkflowValidationStatusView({
			hasResult: query.data !== undefined,
			errorCount: errors.length,
			isFetching: query.isFetching,
			fetchError: query.isError ? query.error : null,
			hasUnsavedChanges,
			executionFailureMessage,
		}),
		handleRevalidate: () => {
			if (workflowId) void query.refetch()
		},
		revalidate,
		applyExecutionError,
	}
}
