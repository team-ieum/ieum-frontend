export const MEASUREMENT_NETWORK_PREFIX = '[IEUM_MEASUREMENT_NETWORK] '
export const MEASUREMENT_PROFILER_PREFIX = '[IEUM_MEASUREMENT_PROFILER] '

export const logMeasurementEvent = (prefix: string, event: object) => {
	console.info(`${prefix}${JSON.stringify(event)}`)
}
