import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@/mocks/server'
import { useAuthMode } from '@/stores/useAuthMode'
import { useAuthStore } from '@/stores/useAuthStore'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { useModalStore } from '@/stores/useModalStore'
import { cleanupHarnessResources } from '@/test/harnessCleanup'
import { installDomEnvironment, resetDomEnvironment } from '@/test/domEnvironment'

installDomEnvironment()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
	cleanup()
	cleanupHarnessResources()
	server.resetHandlers()
	localStorage.clear()
	useAuthStore.setState(useAuthStore.getInitialState(), true)
	useAuthMode.setState(useAuthMode.getInitialState(), true)
	useModalStore.setState(useModalStore.getInitialState(), true)
	useExecutionStore.setState(useExecutionStore.getInitialState(), true)
	resetDomEnvironment()
})

afterAll(() => server.close())
