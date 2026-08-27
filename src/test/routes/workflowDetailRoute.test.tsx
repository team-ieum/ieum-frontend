import { act, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import { createAllFailureHandlers, createDelayedSuccessHandlers, createEmptyHandlers } from '@/mocks/apiScenarios'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { renderAppRoute } from '@/test/renderAppRoute'

vi.mock('sockjs-client', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@stomp/stompjs', () => ({
	Client: class {
		active = false
		connected = false
		activate() {
			this.active = true
		}
		deactivate() {
			this.active = false
			return Promise.resolve()
		}
		subscribe() {
			return { unsubscribe: vi.fn() }
		}
		publish() {}
	},
}))

const detailPath = `/workflow/${WORKFLOW_FIXTURE_ID}`

describe('/workflow/:workflowId route harness', () => {
	it('cold 진입에서 shell을 유지하고 HTTP 응답 뒤 실제 editor를 표시한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))

		renderAppRoute(detailPath)

		expect(screen.getByDisplayValue('워크플로우 제목')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()
		expect(await screen.findByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toBeInTheDocument()
	})

	it('warm 재방문은 cache를 즉시 표시하고 stale detail만 refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const { router } = renderAppRoute(detailPath, { queryClient })
		await screen.findByDisplayValue('고객 문의 자동 분류')
		await waitFor(() => {
			expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		})
		await act(async () => router.navigate('/user'))
		server.use(...createDelayedSuccessHandlers(40))
		await act(async () => router.navigate(detailPath))

		expect(screen.getByDisplayValue('고객 문의 자동 분류')).toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.providers.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID) })).toBe(0))
	})

	it('empty detail은 null 계약을 만들지 않고 빈 editor document로 재현한다', async () => {
		server.use(...createEmptyHandlers())

		renderAppRoute(detailPath)

		expect(await screen.findByDisplayValue('빈 워크플로우')).toBeInTheDocument()
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toBeInTheDocument()
	})

	it('전체 실패에서 detail query error와 현재 shell-only 상태를 재현한다', async () => {
		server.use(...createAllFailureHandlers())

		const { queryClient } = renderAppRoute(detailPath)

		await waitFor(() =>
			expect(queryClient.getQueryState(queryKeys.workflows.detail(WORKFLOW_FIXTURE_ID))?.status).toBe('error')
		)
		expect(screen.getByDisplayValue('워크플로우 제목')).toBeInTheDocument()
		expect(screen.queryByRole('switch', { name: '워크플로우 비활성화' })).not.toBeInTheDocument()
	})
})
