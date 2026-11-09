import { http, HttpResponse, type HttpHandler } from 'msw'
import { createValidateWorkflowResponse } from '@/mocks/fixtures/workflowValidation'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'

export const WORKFLOW_VALIDATE_PATH = '*/api/v1/workflows/:workflowId/validate'
const WORKFLOW_EXECUTE_PATH = '*/api/v1/workflows/:workflowId/execute'

type ValidationRequestObserver = (workflowId: string) => void

/** 검사 결과 mock. 기본은 오류 없는 결과이며, 요청마다 `onRequest`로 워크플로우 id를 알린다. */
export const createWorkflowValidateHandler = (
	errors: WorkflowValidationErrorDto[] = [],
	onRequest?: ValidationRequestObserver
): HttpHandler =>
	http.post(WORKFLOW_VALIDATE_PATH, ({ params }) => {
		onRequest?.(String(params.workflowId))
		return HttpResponse.json(createValidateWorkflowResponse(errors))
	})

/** 검사 서버 장애. 서버는 data 없이 502 `PROVIDER_ERROR`를 돌려준다. */
export const createWorkflowValidateProviderErrorHandler = (onRequest?: ValidationRequestObserver): HttpHandler =>
	http.post(WORKFLOW_VALIDATE_PATH, ({ params }) => {
		onRequest?.(String(params.workflowId))
		return HttpResponse.json(
			{ success: false, data: null, message: '검사 서버에 연결하지 못했습니다.', code: 'PROVIDER_ERROR' },
			{ status: 502 }
		)
	})

/** 수동 실행이 정적 검사에 걸려 거부된 응답. message는 서버 형식 "검증 실패 N건: <첫 오류 message>"를 따른다. */
export const createWorkflowExecuteValidationFailedHandler = (errors: WorkflowValidationErrorDto[]): HttpHandler =>
	http.post(WORKFLOW_EXECUTE_PATH, () =>
		HttpResponse.json(
			{
				success: false,
				data: { errors },
				message: `검증 실패 ${errors.length}건: ${errors[0]?.message ?? ''}`,
				code: 'WORKFLOW_VALIDATION_FAILED',
			},
			{ status: 400 }
		)
	)
