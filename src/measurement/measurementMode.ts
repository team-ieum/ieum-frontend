import { setupWorker } from 'msw/browser'
import { createDelayedSuccessHandlers } from '@/mocks/apiScenarios'
import { seedMeasurementAuthState } from './measurementAuth'
import { parseMeasurementDelay } from './measurementConfig'
import { onMeasurementUnhandledRequest } from './measurementRequestPolicy'

export const enableMeasurementMode = async () => {
	seedMeasurementAuthState()
	const delayMs = parseMeasurementDelay(import.meta.env.VITE_MEASUREMENT_DELAY_MS)
	const worker = setupWorker(...createDelayedSuccessHandlers(delayMs))
	await worker.start({ onUnhandledRequest: onMeasurementUnhandledRequest })
}
