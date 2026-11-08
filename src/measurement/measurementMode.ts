import { setupWorker } from 'msw/browser'
import { createDelayedSuccessHandlers } from '@/mocks/apiScenarios'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { createWorkflowValidateHandler } from '@/mocks/workflowValidationHandlers'
import { seedMeasurementAuthState } from './measurementAuth'
import { parseMeasurementDelay } from './measurementConfig'
import { onMeasurementUnhandledRequest } from './measurementRequestPolicy'
import { installMeasurementResourceObserver } from './measurementResourceObserver'

export const enableMeasurementMode = async () => {
	seedMeasurementAuthState()
	installMeasurementResourceObserver()
	const delayMs = parseMeasurementDelay(import.meta.env.VITE_MEASUREMENT_DELAY_MS)
	const worker = setupWorker(
		...createDelayedSuccessHandlers(delayMs),
		...createNodeTestHandlers({ delayMs, remembersSamples: true }),
		createWorkflowValidateHandler()
	)
	await worker.start({ onUnhandledRequest: onMeasurementUnhandledRequest })
}
