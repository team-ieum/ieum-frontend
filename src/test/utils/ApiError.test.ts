import { describe, expect, it } from 'vitest'
import { ApiError, isApiError } from '@/utils/ApiError'

describe('ApiError', () => {
	it('추가 정보 없이 만들면 data는 null, status는 없다', () => {
		const error = new ApiError('INVALID_WORKFLOW', '워크플로우 구성을 확인해주세요.')

		expect(isApiError(error)).toBe(true)
		expect(error).toMatchObject({ code: 'INVALID_WORKFLOW', message: '워크플로우 구성을 확인해주세요.', data: null })
		expect(error.status).toBeUndefined()
	})
})
