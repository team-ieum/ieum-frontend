import { describe, expect, it } from 'vitest'
import { toMeasurementNetworkEvent, type MeasurementResourceTiming } from '@/measurement/measurementResourceTiming'
import { measurementSessionId } from '@/measurement/measurementSession'

const resourceEntry: MeasurementResourceTiming = {
	name: 'https://api.example.com/api/v1/workflows?size=20',
	initiatorType: 'xmlhttprequest',
	startTime: 120.5,
	duration: 800.25,
	responseEnd: 920.75,
	transferSize: 1234,
	encodedBodySize: 1000,
	decodedBodySize: 2400,
}

const context = {
	sessionId: measurementSessionId,
	completedAtPathname: '/workflow',
	baseUrl: 'http://localhost:5173/workflow',
}

describe('measurement resource timing', () => {
	it('API resource entry를 Network console event로 변환한다', () => {
		expect(toMeasurementNetworkEvent(resourceEntry, context)).toEqual({
			sessionId: measurementSessionId,
			completedAtPathname: '/workflow',
			name: 'https://api.example.com/api/v1/workflows?size=20',
			path: '/api/v1/workflows?size=20',
			initiatorType: 'xmlhttprequest',
			startTime: 120.5,
			duration: 800.25,
			responseEnd: 920.75,
			transferSize: 1234,
			encodedBodySize: 1000,
			decodedBodySize: 2400,
		})
	})

	it('API가 아닌 resource entry를 제외한다', () => {
		expect(toMeasurementNetworkEvent({ ...resourceEntry, name: '/assets/index.js' }, context)).toBeNull()
	})
})
