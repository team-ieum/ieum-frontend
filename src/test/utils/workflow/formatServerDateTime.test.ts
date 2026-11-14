import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatServerDateTime } from '@/utils/workflow/formatServerDateTime'

// UTC 시간대에서는 숫자만 잘라 써도 결과가 같아 회귀를 못 잡으므로 화면 시간대를 한국으로 고정한다.
// Node는 실행 중 process.env.TZ가 바뀌면 Date 시간대를 다시 읽는다.
describe('formatServerDateTime', () => {
	beforeEach(() => vi.stubEnv('TZ', 'Asia/Seoul'))
	afterEach(() => vi.unstubAllEnvs())

	it('UTC(…Z) 서버 시각을 화면 시간대 시각으로 바꿔 보여 준다', () => {
		expect(formatServerDateTime('2026-11-02T00:05:30.123Z')).toBe('11월 2일 09:05')
		expect(formatServerDateTime('2026-11-01T15:30:00Z')).toBe('11월 2일 00:30')
	})

	it.each([['2026-11-02T09:05:30'], ['2026-11-02T09:05:30.123456']])(
		'오프셋 없는 옛 형식 %s은 숫자를 그대로 보여 준다',
		value => {
			expect(formatServerDateTime(value)).toBe('11월 2일 09:05')
		}
	)

	it('읽을 수 없는 값은 그대로 둔다', () => {
		expect(formatServerDateTime('어제')).toBe('어제')
	})
})
