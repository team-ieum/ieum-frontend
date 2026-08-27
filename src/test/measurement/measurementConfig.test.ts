import { describe, expect, it } from 'vitest'
import { DEFAULT_MEASUREMENT_DELAY_MS, parseMeasurementDelay } from '@/measurement/measurementConfig'

describe('measurement config', () => {
	it('설정한 0 이상의 지연값을 사용한다', () => {
		expect(parseMeasurementDelay('1200')).toBe(1200)
		expect(parseMeasurementDelay('0')).toBe(0)
	})

	it('유효하지 않은 지연값은 기본값으로 복구한다', () => {
		expect(parseMeasurementDelay(undefined)).toBe(DEFAULT_MEASUREMENT_DELAY_MS)
		expect(parseMeasurementDelay('-1')).toBe(DEFAULT_MEASUREMENT_DELAY_MS)
		expect(parseMeasurementDelay('invalid')).toBe(DEFAULT_MEASUREMENT_DELAY_MS)
	})
})
