import { afterEach, describe, expect, it, vi } from 'vitest'
import { credentialsQueryOptions, providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'
import {
	workflowDashboardErrorsQueryOptions,
	workflowDashboardExecutionsQueryOptions,
	workflowDashboardSummaryQueryOptions,
} from '@/hooks/dashboard/queries/workflowDashboardQueryOptions'
import { oauthConnectionsQueryOptions } from '@/hooks/oauthConnections/queries/oauthConnectionsQueryOptions'
import { webhookCredentialsQueryOptions } from '@/hooks/webhookCredentials/queries/webhookCredentialsQueryOptions'
import { workflowListQueryOptions } from '@/hooks/workflow/queries/workflowListQueryOptions'
import { createObservedSuccessHandlers } from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'

afterEach(() => {
	vi.useRealTimers()
})

describe('query cache policy', () => {
	it.each([
		['dashboard summary', workflowDashboardSummaryQueryOptions().staleTime, 30_000],
		['dashboard executions', workflowDashboardExecutionsQueryOptions().staleTime, 10_000],
		['dashboard errors', workflowDashboardErrorsQueryOptions().staleTime, 10_000],
		['workflow list', workflowListQueryOptions().staleTime, 30_000],
		['OAuth connections', oauthConnectionsQueryOptions().staleTime, 10_000],
		['webhook credentials', webhookCredentialsQueryOptions().staleTime, 10_000],
		['providers', providersQueryOptions().staleTime, 5 * 60_000],
		['credentials', credentialsQueryOptions().staleTime, 10_000],
	])('%s staleTime을 확정 정책값으로 유지한다', (_name, staleTime, expectedStaleTime) => {
		expect(staleTime).toBe(expectedStaleTime)
	})

	it('OAuth connections는 10초 경계 전 cache를 재사용하고 경계 후 다시 요청한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		const startedAt = new Date('2026-08-28T00:00:00.000Z').getTime()
		server.use(...createObservedSuccessHandlers(observeRequest))
		vi.setSystemTime(startedAt)

		try {
			await queryClient.prefetchQuery(oauthConnectionsQueryOptions())
			expect(observeRequest).toHaveBeenCalledWith('oauthConnections')
			expect(observeRequest).toHaveBeenCalledTimes(1)

			vi.setSystemTime(startedAt + 9_999)
			await queryClient.fetchQuery(oauthConnectionsQueryOptions())
			expect(observeRequest).toHaveBeenCalledTimes(1)

			vi.setSystemTime(startedAt + 10_001)
			await queryClient.fetchQuery(oauthConnectionsQueryOptions())
			expect(observeRequest).toHaveBeenCalledTimes(2)
		} finally {
			queryClient.clear()
		}
	})
})
