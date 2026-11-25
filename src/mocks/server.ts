import { setupServer } from 'msw/node'
import { createSuccessHandlers } from '@/mocks/apiScenarios'
import { createDiscordOAuthHandlers } from '@/mocks/discordOAuthHandlers'
import { createGoogleOAuthHandlers } from '@/mocks/googleOAuthHandlers'
import { createIntegrationWorkflowsHandlers } from '@/mocks/integrationWorkflowsHandlers'
import { createNodeOptionsHandlers } from '@/mocks/nodeOptionsHandlers'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { createSlackOAuthHandlers } from '@/mocks/slackOAuthHandlers'
import { createWebhookTokenHandlers } from '@/mocks/webhookTokenHandlers'
import { createWorkflowValidateHandler } from '@/mocks/workflowValidationHandlers'
import { handlers } from './handlers'

export const server = setupServer(
	...handlers,
	...createSuccessHandlers(),
	...createNodeTestHandlers(),
	...createNodeOptionsHandlers(),
	...createWebhookTokenHandlers(),
	...createSlackOAuthHandlers(),
	...createDiscordOAuthHandlers(),
	...createGoogleOAuthHandlers(),
	...createIntegrationWorkflowsHandlers(),
	createWorkflowValidateHandler()
)
