import type { ApiResponse } from '@/types/api'

/** 서버 정적 검사 오류 코드. 화면 문구에는 쓰지 않고 아이콘 구분에만 쓴다. */
export type WorkflowValidationErrorCode =
	| 'REQUIRED'
	| 'TYPE'
	| 'CHOICE'
	| 'REF_NOT_ALLOWED'
	| 'REF_FORMAT'
	| 'REF_UNKNOWN_NODE'
	| 'REF_SELF'
	| 'REF_NOT_UPSTREAM'
	| 'REF_UNKNOWN_FIELD'
	| 'TRIGGER_COUNT'
	| 'EDGE_INVALID'
	| 'ORPHAN_NODE'
	| 'CRON'
	| 'TOO_LARGE'
	| (string & {})

/** 정적 검사 오류 하나. 같은 오류는 한 번만 오고, 응답 하나에 최대 200건이다. */
export type WorkflowValidationErrorDto = {
	/** 오류가 난 노드. null이면 워크플로우 전체 오류(트리거 개수, 크기 등)다. */
	nodeId: string | null
	/**
	 * 노드 안 칸 경로. 카탈로그 칸 path와 같은 규칙이다.
	 * 예: `config.channel`, 도구 칸 `config.tools.0.config.query`, 목록 하위 칸 `config.attendees.2.email`.
	 */
	field: string | null
	code: WorkflowValidationErrorCode
	/** 사용자에게 그대로 보여 줄 문구. */
	message: string
}

export type WorkflowValidationResultDto = {
	/** 판단에는 쓰지 않는다. 문제 여부는 `errors`가 비었는지로 본다. */
	valid: boolean
	errors: WorkflowValidationErrorDto[]
}

export type ValidateWorkflowResponse = ApiResponse<WorkflowValidationResultDto>

/** 다시 검사한 결과. `unavailable`은 검사 요청 자체가 실패했다는 뜻이다(502, 네트워크 등). */
export type WorkflowRevalidateResult = { status: 'ok'; errorCount: number } | { status: 'unavailable' }

/** 툴바 검사 상태 칩의 색 구분. */
export type WorkflowValidationTone = 'neutral' | 'success' | 'danger' | 'warning'

/** 툴바 검사 상태 칩에 그릴 값. 검사 결과가 없고 검사 중도 아니면 칩을 그리지 않는다. */
export type WorkflowValidationStatusView = {
	tone: WorkflowValidationTone
	label: string
	/** 라벨 뒤에 붙는 보조 문구(예: '저장된 버전 기준'). */
	detail?: string
	isChecking: boolean
	canRetry: boolean
}
