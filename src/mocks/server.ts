import { setupServer } from 'msw/node'
import { createSuccessHandlers } from '@/mocks/apiScenarios'
import { integrationHandlers } from '@/mocks/integrationHandlers'
import { createNodeOptionsHandlers } from '@/mocks/nodeOptionsHandlers'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { createSlackOAuthHandlers } from '@/mocks/slackOAuthHandlers'
import { createWebhookTokenHandlers } from '@/mocks/webhookTokenHandlers'
import { createWorkflowValidateHandler } from '@/mocks/workflowValidationHandlers'
import { handlers } from './handlers'

export const server = setupServer(
	...handlers,
	...createSuccessHandlers(),
	...integrationHandlers,
	...createNodeTestHandlers(),
	...createNodeOptionsHandlers(),
	...createWebhookTokenHandlers(),
	...createSlackOAuthHandlers(),
	createWorkflowValidateHandler()
)
