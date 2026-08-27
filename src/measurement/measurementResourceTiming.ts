export type MeasurementResourceTiming = Pick<
	PerformanceResourceTiming,
	'name' | 'initiatorType' | 'startTime' | 'duration' | 'responseEnd' | 'transferSize' | 'encodedBodySize' | 'decodedBodySize'
>

export type MeasurementNetworkEvent = {
	sessionId: string
	completedAtPathname: string
	name: string
	path: string
	initiatorType: string
	startTime: number
	duration: number
	responseEnd: number
	transferSize: number
	encodedBodySize: number
	decodedBodySize: number
}

type MeasurementResourceContext = {
	sessionId: string
	completedAtPathname: string
	baseUrl: string
}

export const toMeasurementNetworkEvent = (
	entry: MeasurementResourceTiming,
	context: MeasurementResourceContext
): MeasurementNetworkEvent | null => {
	const url = new URL(entry.name, context.baseUrl)
	if (!url.pathname.startsWith('/api/')) return null

	return {
		sessionId: context.sessionId,
		completedAtPathname: context.completedAtPathname,
		name: entry.name,
		path: `${url.pathname}${url.search}`,
		initiatorType: entry.initiatorType,
		startTime: entry.startTime,
		duration: entry.duration,
		responseEnd: entry.responseEnd,
		transferSize: entry.transferSize,
		encodedBodySize: entry.encodedBodySize,
		decodedBodySize: entry.decodedBodySize,
	}
}
