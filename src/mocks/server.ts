import { setupServer } from 'msw/node'
import { createSuccessHandlers } from '@/mocks/apiScenarios'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { createSlackOAuthHandlers } from '@/mocks/slackOAuthHandlers'
import { createWebhookTokenHandlers } from '@/mocks/webhookTokenHandlers'
import { createWorkflowValidateHandler } from '@/mocks/workflowValidationHandlers'
import { handlers } from './handlers'

export const server = setupServer(
	...handlers,
	...createSuccessHandlers(),
	...createNodeTestHandlers(),
	...createWebhookTokenHandlers(),
	...createSlackOAuthHandlers(),
	createWorkflowValidateHandler()
)
