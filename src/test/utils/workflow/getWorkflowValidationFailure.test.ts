import { describe, expect, it } from 'vitest'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { ApiError } from '@/utils/ApiError'
import { getWorkflowValidationFailure } from '@/utils/workflow/getWorkflowValidationFailure'

const validError: WorkflowValidationErrorDto = {
	nodeId: 'node-1',
	field: 'config.channel',
	code: 'REQUIRED',
	message: '채널을 골라 주세요.',
}

describe('getWorkflowValidationFailure', () => {
	it('400 WORKFLOW_VALIDATION_FAILED에서 서버 문구와 검사 오류를 꺼낸다', () => {
		const error = new ApiError('WORKFLOW_VALIDATION_FAILED', '검증 실패 1건: 채널을 골라 주세요.', {
			data: { errors: [validError] },
			status: 400,
		})

		expect(getWorkflowValidationFailure(error)).toEqual({
			message: '검증 실패 1건: 채널을 골라 주세요.',
			errors: [validError],
		})
	})

	it('모양이 맞지 않는 오류 원소는 버린다', () => {
		const error = new ApiError('WORKFLOW_VALIDATION_FAILED', '검증 실패 2건', {
			data: { errors: [validError, { nodeId: 1, field: null, code: 'REQUIRED', message: '숫자 id' }, null] },
		})

		expect(getWorkflowValidationFailure(error)?.errors).toEqual([validError])
	})

	it.each([
		['다른 오류 코드', new ApiError('WORKFLOW_NOT_FOUND', '없음', { data: { errors: [validError] } })],
		['data 없음', new ApiError('WORKFLOW_VALIDATION_FAILED', '검증 실패')],
		['errors가 배열이 아님', new ApiError('WORKFLOW_VALIDATION_FAILED', '검증 실패', { data: { errors: 'x' } })],
		['ApiError가 아님', new Error('network')],
	])('%s이면 null이다', (_, error) => {
		expect(getWorkflowValidationFailure(error)).toBeNull()
	})
})
