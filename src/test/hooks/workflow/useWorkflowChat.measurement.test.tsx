import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'
import { useAuthStore } from '@/stores/useAuthStore'

const mocks = vi.hoisted(() => ({
	activate: vi.fn(),
	deactivate: vi.fn(),
	client: vi.fn(function () {
		return {
			active: false,
			connected: false,
			activate: mocks.activate,
			deactivate: mocks.deactivate,
		}
	}),
}))

vi.mock('@stomp/stompjs', () => ({ Client: mocks.client }))
vi.mock('sockjs-client', () => ({ default: vi.fn() }))
vi.mock('@/hooks/aiCredentials/queries/useCredentialsQuery', () => ({
	useCredentialsQuery: () => ({ data: undefined }),
}))

describe('useWorkflowChat measurement mode', () => {
	beforeEach(() => {
		useAuthStore.setState({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' })
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	it('측정 모드에서는 STOMP client를 생성하지 않는다', () => {
		vi.stubEnv('VITE_MEASUREMENT_MODE', 'true')

		renderHook(() => useWorkflowChat('workflow-id', [], []))

		expect(mocks.client).not.toHaveBeenCalled()
		expect(mocks.activate).not.toHaveBeenCalled()
	})

	it('일반 모드에서는 기존처럼 STOMP client를 활성화한다', () => {
		vi.stubEnv('VITE_MEASUREMENT_MODE', 'false')

		const { unmount } = renderHook(() => useWorkflowChat('workflow-id', [], []))

		expect(mocks.client).toHaveBeenCalledTimes(1)
		expect(mocks.activate).toHaveBeenCalledTimes(1)
		unmount()
	})
})
