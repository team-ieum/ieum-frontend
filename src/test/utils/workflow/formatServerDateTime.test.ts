import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatServerDateTime } from '@/utils/workflow/formatServerDateTime'

// 브라우저 시간대와 무관하게 한국 시각이 나오는지 보려고 화면 시간대를 한국과 다른 곳으로 둔다.
// Node는 실행 중 process.env.TZ가 바뀌면 Date 시간대를 다시 읽는다.
describe.each(['America/Los_Angeles', 'UTC', 'Asia/Seoul'])('formatServerDateTime (화면 시간대 %s)', timeZone => {
	beforeEach(() => vi.stubEnv('TZ', timeZone))
	afterEach(() => vi.unstubAllEnvs())

	it('UTC(…Z) 서버 시각을 한국 시각으로 바꿔 보여 준다', () => {
		expect(formatServerDateTime('2026-11-02T02:30:00.123Z')).toBe('11월 2일 11:30')
	})

	it('UTC 자정 직전은 한국에서 다음 날로 넘어간다', () => {
		expect(formatServerDateTime('2026-11-01T15:30:00Z')).toBe('11월 2일 00:30')
		expect(formatServerDateTime('2026-12-31T15:00:00Z')).toBe('1월 1일 00:00')
	})

	it('±hh:mm 오프셋이 붙은 값도 한국 시각으로 바꾼다', () => {
		expect(formatServerDateTime('2026-11-02T00:05:00-05:00')).toBe('11월 2일 14:05')
	})

	it.each([['2026-11-02T09:05:30'], ['2026-11-02T09:05:30.123456']])(
		'오프셋 없는 옛 형식 %s은 한국 시각으로 보고 숫자를 그대로 보여 준다',
		value => {
			expect(formatServerDateTime(value)).toBe('11월 2일 09:05')
		}
	)

	it('읽을 수 없는 값은 그대로 둔다', () => {
		expect(formatServerDateTime('어제')).toBe('어제')
		expect(formatServerDateTime('')).toBe('')
	})
})
