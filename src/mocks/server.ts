import { setupServer } from 'msw/node'
import { createSuccessHandlers } from '@/mocks/apiScenarios'
import { createNodeTestHandlers } from '@/mocks/nodeTestHandlers'
import { handlers } from './handlers'

export const server = setupServer(...handlers, ...createSuccessHandlers(), ...createNodeTestHandlers())
