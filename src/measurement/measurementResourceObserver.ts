import { logMeasurementEvent, MEASUREMENT_NETWORK_PREFIX } from './measurementConsole'
import { toMeasurementNetworkEvent } from './measurementResourceTiming'
import { measurementSessionId } from './measurementSession'

export const installMeasurementResourceObserver = () => {
	const observer = new PerformanceObserver(list => {
		for (const entry of list.getEntries()) {
			if (entry.entryType !== 'resource') continue
			const event = toMeasurementNetworkEvent(entry as PerformanceResourceTiming, {
				sessionId: measurementSessionId,
				completedAtPathname: window.location.pathname,
				baseUrl: window.location.href,
			})
			if (event) logMeasurementEvent(MEASUREMENT_NETWORK_PREFIX, event)
		}
	})

	observer.observe({ type: 'resource', buffered: true })
}
