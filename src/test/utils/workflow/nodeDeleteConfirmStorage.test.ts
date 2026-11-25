import { afterEach, describe, expect, it, vi } from 'vitest'
import { getShouldConfirmNodeDelete, setShouldConfirmNodeDelete } from '@/utils/workflow/nodeDeleteConfirmStorage'

describe('nodeDeleteConfirmStorage', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('저장한 값이 없으면 확인 창을 띄우고, 끄고 다시 켠 값을 그대로 돌려준다', () => {
		expect(getShouldConfirmNodeDelete()).toBe(true)

		expect(setShouldConfirmNodeDelete(false)).toBe(true)
		expect(getShouldConfirmNodeDelete()).toBe(false)

		expect(setShouldConfirmNodeDelete(true)).toBe(true)
		expect(getShouldConfirmNodeDelete()).toBe(true)
	})

	it('저장소를 쓸 수 없으면 확인 창을 띄우는 쪽으로 보고 저장 실패를 알린다', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError')
		})

		expect(getShouldConfirmNodeDelete()).toBe(true)
		expect(setShouldConfirmNodeDelete(false)).toBe(false)
	})
})
