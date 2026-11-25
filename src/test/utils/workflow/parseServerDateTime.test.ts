import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseServerDateTime } from '@/utils/workflow/parseServerDateTime'

// 화면 시간대를 한국과 다른 곳으로 바꿔도 같은 시각으로 읽는지 본다.
describe('parseServerDateTime', () => {
	afterEach(() => vi.unstubAllEnvs())

	it.each(['America/Los_Angeles', 'UTC', 'Asia/Seoul'])(
		'오프셋 없는 값은 화면 시간대(%s)와 상관없이 한국 시각으로 읽는다',
		timeZone => {
			vi.stubEnv('TZ', timeZone)
			expect(parseServerDateTime('2026-11-02T09:05:30')).toBe(Date.parse('2026-11-02T00:05:30Z'))
		}
	)

	it('명시적 오프셋이 있는 값은 그대로 읽는다', () => {
		expect(parseServerDateTime('2026-11-02T00:05:30Z')).toBe(Date.parse('2026-11-02T00:05:30Z'))
		expect(parseServerDateTime('2026-11-02T00:05:30-05:00')).toBe(Date.parse('2026-11-02T05:05:30Z'))
	})

	it('읽을 수 없는 값은 NaN이다', () => {
		expect(parseServerDateTime('어제')).toBeNaN()
	})
})
