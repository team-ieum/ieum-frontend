import { describe, expect, it } from 'vitest'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { groupWorkflowValidationErrors } from '@/utils/workflow/groupWorkflowValidationErrors'

describe('groupWorkflowValidationErrors', () => {
	it('nodeId가 null인 오류는 전체 오류로, 나머지는 노드별로 응답 순서대로 나눈다', () => {
		const globalError: WorkflowValidationErrorDto = {
			nodeId: null,
			field: null,
			code: 'TRIGGER_COUNT',
			message: '트리거 개수',
		}
		const firstA: WorkflowValidationErrorDto = { nodeId: 'a', field: 'config.url', code: 'REQUIRED', message: 'A 첫째' }
		const onlyB: WorkflowValidationErrorDto = { nodeId: 'b', field: null, code: 'ORPHAN_NODE', message: 'B' }
		const secondA: WorkflowValidationErrorDto = { nodeId: 'a', field: 'config.body', code: 'TYPE', message: 'A 둘째' }

		const { globalErrors, errorsByNodeId } = groupWorkflowValidationErrors([firstA, globalError, onlyB, secondA])

		expect(globalErrors).toEqual([globalError])
		expect(errorsByNodeId.get('a')).toEqual([firstA, secondA])
		expect(errorsByNodeId.get('b')).toEqual([onlyB])
		expect(errorsByNodeId.size).toBe(2)
	})
})
