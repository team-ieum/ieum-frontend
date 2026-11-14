import { setupWorker } from 'msw/browser'
import { createDelayedSuccessHandlers } from '@/mocks/apiScenarios'
import { createNodeOptionsHandlers } from '@/mocks/nodeOptionsHandlers'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { createSlackOAuthHandlers } from '@/mocks/slackOAuthHandlers'
import { createWebhookTokenHandlers } from '@/mocks/webhookTokenHandlers'
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
		// 연결 목록 조회를 Slack 연결 상태로 덮어써야 하므로 기본 성공 handler보다 앞에 둔다.
		...createSlackOAuthHandlers({
			delayMs,
			authUrl: `${window.location.origin}/inter-setting?connected=slack`,
			connectionStorage: window.sessionStorage,
		}),
		...createDelayedSuccessHandlers(delayMs),
		...createNodeTestHandlers({ delayMs, remembersSamples: true }),
		...createNodeOptionsHandlers({ delayMs }),
		...createWebhookTokenHandlers({ delayMs, remembersTokens: true }),
		createWorkflowValidateHandler()
	)
	await worker.start({ onUnhandledRequest: onMeasurementUnhandledRequest })
}
