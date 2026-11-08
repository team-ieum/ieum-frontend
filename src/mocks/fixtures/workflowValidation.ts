import type { ValidateWorkflowResponse, WorkflowValidationErrorDto } from '@/types/workflowValidation'

/** `workflowFixture` 노드 id에 맞춘 검사 오류. 노드 칸 오류 둘, 노드 전체 오류 하나, 워크플로우 전체 오류 하나다. */
export const workflowValidationErrorsFixture: WorkflowValidationErrorDto[] = [
	{ nodeId: 'http-1', field: 'config.url', code: 'REQUIRED', message: '요청 주소를 입력해 주세요.' },
	{
		nodeId: 'http-1',
		field: 'config.body',
		code: 'REF_NOT_UPSTREAM',
		message: '앞에 연결되지 않은 노드의 출력을 참조하고 있어요.',
	},
	{ nodeId: 'trigger-1', field: null, code: 'ORPHAN_NODE', message: '다음 노드와 연결되지 않았어요.' },
	{ nodeId: null, field: null, code: 'TRIGGER_COUNT', message: '트리거는 하나만 둘 수 있어요.' },
]

export const createValidateWorkflowResponse = (errors: WorkflowValidationErrorDto[]): ValidateWorkflowResponse => ({
	success: true,
	data: { valid: errors.length === 0, errors },
	message: 'OK',
	code: 'OK',
})
