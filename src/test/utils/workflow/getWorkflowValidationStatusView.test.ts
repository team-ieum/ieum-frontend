import { describe, expect, it } from 'vitest'
import { ApiError } from '@/utils/ApiError'
import { getWorkflowValidationStatusView } from '@/utils/workflow/getWorkflowValidationStatusView'

const BASE = {
	hasResult: true,
	errorCount: 0,
	isFetching: false,
	fetchError: null,
	hasUnsavedChanges: false,
	executionFailureMessage: null,
}

describe('getWorkflowValidationStatusView', () => {
	it('검사 결과도 진행 중인 검사도 없으면 칩을 그리지 않는다', () => {
		expect(getWorkflowValidationStatusView({ ...BASE, hasResult: false })).toBeNull()
	})

	it('검사 중이면 이전 결과와 관계없이 검사 중으로 보여 준다', () => {
		expect(getWorkflowValidationStatusView({ ...BASE, errorCount: 3, isFetching: true })).toMatchObject({
			label: '검사 중…',
			isChecking: true,
			canRetry: false,
		})
	})

	it('문제가 있으면 개수를, 미저장 변경이 있으면 저장된 버전 기준임을 함께 보여 준다', () => {
		expect(getWorkflowValidationStatusView({ ...BASE, errorCount: 2 })).toMatchObject({
			tone: 'danger',
			label: '문제 2건',
			detail: undefined,
		})
		expect(getWorkflowValidationStatusView({ ...BASE, errorCount: 2, hasUnsavedChanges: true })).toMatchObject({
			label: '문제 2건',
			detail: '저장된 버전 기준',
		})
	})

	it('문제가 없으면 문제 없음으로 보여 준다', () => {
		expect(getWorkflowValidationStatusView(BASE)).toMatchObject({ tone: 'success', label: '문제 없음' })
	})

	it('PROVIDER_ERROR나 네트워크 오류면 지금은 검사할 수 없다고 알리고 이전 문제 수를 함께 남긴다', () => {
		const providerError = new ApiError('PROVIDER_ERROR', '검사 서버에 연결하지 못했습니다.', { status: 502 })

		expect(getWorkflowValidationStatusView({ ...BASE, errorCount: 2, fetchError: providerError })).toEqual({
			tone: 'warning',
			label: '지금은 검사할 수 없어요',
			detail: '이전 결과 문제 2건',
			isChecking: false,
			canRetry: true,
		})
		expect(getWorkflowValidationStatusView({ ...BASE, fetchError: new Error('network') })).toMatchObject({
			label: '지금은 검사할 수 없어요',
			detail: undefined,
			canRetry: true,
		})
	})

	it.each([
		['INVALID_WORKFLOW', '버전이 없는 워크플로우입니다.', 400],
		['WORKFLOW_NOT_FOUND', '워크플로우를 찾을 수 없습니다.', 404],
	] as const)('다시 해도 같은 %s 오류는 서버 문구를 보여 주고 다시 검사를 권하지 않는다', (code, message, status) => {
		const error = new ApiError(code, message, { status })

		expect(getWorkflowValidationStatusView({ ...BASE, hasResult: false, fetchError: error })).toMatchObject({
			label: message,
			canRetry: false,
		})
	})

	it.each([
		['INTERNAL_SERVER_ERROR', 500],
		['UNAUTHORIZED', 401],
		['FORBIDDEN', 403],
	] as const)('명세가 정하지 않은 %s 오류는 검사할 수 없다고 알리고 다시 검사를 권한다', (code, status) => {
		const error = new ApiError(code, '서버 원문', { status })

		expect(getWorkflowValidationStatusView({ ...BASE, fetchError: error })).toMatchObject({
			label: '지금은 검사할 수 없어요',
			canRetry: true,
		})
	})

	it('수동 실행 400 문구가 있으면 그 문구를 라벨로 보여 준다', () => {
		expect(
			getWorkflowValidationStatusView({
				...BASE,
				errorCount: 1,
				executionFailureMessage: '검증 실패 1건: 채널을 골라 주세요.',
			})
		).toMatchObject({ tone: 'danger', label: '검증 실패 1건: 채널을 골라 주세요.' })
	})
})
