import { setupServer } from 'msw/node'
import { createSuccessHandlers } from '@/mocks/apiScenarios'
import { handlers } from './handlers'

export const server = setupServer(...handlers, ...createSuccessHandlers())
