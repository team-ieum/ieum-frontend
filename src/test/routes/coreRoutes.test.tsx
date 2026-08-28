import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/constants/queryKeys'
import {
	createAllFailureHandlers,
	createDelayedSuccessHandlers,
	createEmptyHandlers,
	createObservedSuccessHandlers,
	createPartialFailureHandlers,
	createResourceEmptyHandler,
	createResourceSuccessHandler,
	type ApiMockResource,
} from '@/mocks/apiScenarios'
import { server } from '@/mocks/server'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import { setReducedMotion } from '@/test/domEnvironment'
import { renderAppRoute } from '@/test/renderAppRoute'

const countRequests = (requestObserver: ReturnType<typeof vi.fn>, resource: ApiMockResource) =>
	requestObserver.mock.calls.filter(([requestedResource]) => requestedResource === resource).length

const markQueryStale = (queryClient: ReturnType<typeof createTestQueryClient>, queryKey: readonly unknown[]) => {
	const data = queryClient.getQueryData(queryKey)
	expect(data).toBeDefined()
	queryClient.setQueryData(queryKey, data, { updatedAt: 1 })
}

describe('주요 route 테스트 harness', () => {
	it('/main cold 진입에서 shell과 loading을 유지한 뒤 데이터를 표시한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))

		renderAppRoute('/main')

		expect(screen.getByLabelText('사이드바')).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 1, name: '대시보드' })).toBeInTheDocument()
		expect(screen.getByRole('status', { name: '대시보드 요약 불러오는 중' })).toBeInTheDocument()
		const summarySkeleton = screen.getByRole('status', { name: '대시보드 요약 불러오는 중' })
		const summaryShimmers = summarySkeleton.querySelectorAll('.pointer-events-none')
		expect(summaryShimmers).toHaveLength(12)
		expect(summaryShimmers[0]?.getAttribute('style')).toContain('0.1')
		expect(summaryShimmers[0]?.getAttribute('style')).toContain('0.06')
		expect(summaryShimmers[7]?.getAttribute('style')).toContain('0.24')
		expect(summaryShimmers[7]?.getAttribute('style')).toContain('0.14')
		expect(screen.getByRole('status', { name: '최근 실행 로그 불러오는 중' })).toBeInTheDocument()
		expect(screen.getByRole('status', { name: '오류 목록 불러오는 중' })).toBeInTheDocument()
		expect(document.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(52)
		expect(screen.queryByText('오늘 총 실행')).not.toBeInTheDocument()
		expect(await screen.findAllByText('고객 문의 자동 분류')).not.toHaveLength(0)
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
	})

	it('/main summary skeleton은 reduced-motion에서 pulse를 정지한다', () => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		setReducedMotion(true)
		server.use(...createDelayedSuccessHandlers(1_000))

		renderAppRoute('/main')

		const skeleton = screen.getByRole('status', { name: '대시보드 요약 불러오는 중' })
		expect(skeleton.querySelector('.pointer-events-none')).not.toBeInTheDocument()
		warning.mockRestore()
	})

	it('/main fresh 재방문은 캐시 콘텐츠를 유지하고 dashboard를 다시 요청하지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))
		const { router } = renderAppRoute('/main', { queryClient })
		await screen.findByText('외부 서비스 응답 지연')
		await waitFor(() => {
			expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardSummary() })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardExecutions(20) })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardErrors(20) })).toBe(0)
		})
		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/main'))

		expect(screen.getByText('총 8개 워크플로우')).toBeInTheDocument()
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardSummary() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardExecutions(20) })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardErrors(20) })).toBe(0)
		expect(countRequests(observeRequest, 'dashboardSummary')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(1)
		expect(countRequests(observeRequest, 'dashboardErrors')).toBe(1)
	})

	it('/main stale 재방문은 캐시 콘텐츠를 유지하고 dashboard를 background refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest, 40))
		const { router } = renderAppRoute('/main', { queryClient })
		await screen.findByText('외부 서비스 응답 지연')
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		markQueryStale(queryClient, queryKeys.workflows.dashboardSummary())
		markQueryStale(queryClient, queryKeys.workflows.dashboardExecutions(20))
		markQueryStale(queryClient, queryKeys.workflows.dashboardErrors(20))
		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/main'))

		expect(screen.getByText('총 8개 워크플로우')).toBeInTheDocument()
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardSummary() })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardExecutions(20) })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.dashboardErrors(20) })).toBe(1)
		expect(countRequests(observeRequest, 'dashboardSummary')).toBe(2)
		expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(2)
		expect(countRequests(observeRequest, 'dashboardErrors')).toBe(2)
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
	})

	it('/main executions refetch 실패는 다른 영역과 기존 실행 로그를 유지한다', async () => {
		const queryClient = createTestQueryClient()
		renderAppRoute('/main', { queryClient })
		await screen.findByText('외부 서비스 응답 지연')
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		server.use(...createPartialFailureHandlers(['dashboardExecutions']))

		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.workflows.dashboardExecutions(20) })
		})

		expect(screen.getByText('총 8개 워크플로우')).toBeInTheDocument()
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(screen.getAllByText('고객 문의 자동 분류')).not.toHaveLength(0)
		expect(await screen.findByText('업데이트하지 못했습니다.')).toBeInTheDocument()
	})

	it('/main empty 결과를 독립적으로 재현한다', async () => {
		server.use(...createEmptyHandlers())

		renderAppRoute('/main')

		expect(await screen.findByText('최근 실행 이력이 없습니다.')).toBeInTheDocument()
		expect(screen.getByText('최근 오류가 없습니다.')).toBeInTheDocument()
		expect(screen.getByText('총 0개 워크플로우')).toBeInTheDocument()
	})

	it('/main 전체 실패를 각 영역의 현재 오류 상태로 재현한다', async () => {
		server.use(...createAllFailureHandlers())

		renderAppRoute('/main')

		expect(await screen.findByText('통계를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('실행 로그를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('오류 목록을 불러오지 못했습니다.')).toBeInTheDocument()
	})

	it('/main executions만 실패하면 다른 dashboard 데이터는 유지한다', async () => {
		server.use(...createPartialFailureHandlers(['dashboardExecutions']))

		renderAppRoute('/main')

		expect(await screen.findByText('실행 로그를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('외부 서비스 응답 지연')).toBeInTheDocument()
		expect(screen.getByText('총 8개 워크플로우')).toBeInTheDocument()
		expect(screen.queryByText('통계를 불러오지 못했습니다.')).not.toBeInTheDocument()
	})

	it('/main executions retry는 실패한 resource만 다시 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['dashboardExecutions']))
		renderAppRoute('/main')
		await screen.findByText('실행 로그를 불러오지 못했습니다.')

		server.use(...createObservedSuccessHandlers(observeRequest))
		fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

		await waitFor(() => expect(countRequests(observeRequest, 'dashboardExecutions')).toBe(1))
		expect(observeRequest).toHaveBeenCalledTimes(1)
		expect(await screen.findAllByText('고객 문의 자동 분류')).not.toHaveLength(0)
	})

	it('/workflow cold loading과 empty 결과를 재현한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))

		const delayed = renderAppRoute('/workflow')
		const cardSkeleton = screen.getByRole('status', { name: '워크플로우 카드 불러오는 중' })
		expect(cardSkeleton).toBeInTheDocument()
		expect(cardSkeleton.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(24)
		expect(cardSkeleton.parentElement).toHaveAttribute('aria-busy', 'true')
		fireEvent.click(screen.getByRole('button', { name: '행 보기' }))
		const tableSkeleton = screen.getByRole('status', { name: '워크플로우 테이블 불러오는 중' })
		expect(tableSkeleton.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(35)
		expect(await screen.findAllByText('고객 문의 자동 분류')).not.toHaveLength(0)
		delayed.dispose()

		server.use(...createEmptyHandlers())
		renderAppRoute('/workflow')

		expect(await screen.findByRole('heading', { level: 2, name: '워크플로우가 아직 없어요' })).toBeInTheDocument()
	})

	it('/workflow fresh 재방문은 SideBar와 공유하는 cache를 사용하고 다시 요청하지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))
		const { router } = renderAppRoute('/workflow', { queryClient })
		await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })
		await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.workflows.list({ size: 20 }) })).toBe(0))
		await act(async () => router.navigate('/user'))
		expect(screen.queryByRole('button', { name: '고객 문의 자동 분류 열기' })).not.toBeInTheDocument()
		await act(async () => router.navigate('/workflow'))

		expect(screen.getByRole('button', { name: '고객 문의 자동 분류 열기' })).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '워크플로우 카드 불러오는 중' })).not.toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.list({ size: 20 }) })).toBe(0)
		expect(countRequests(observeRequest, 'workflowList')).toBe(1)
	})

	it('/workflow stale 재방문은 기존 목록을 유지하고 background refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest, 40))
		const { router } = renderAppRoute('/workflow', { queryClient })
		await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		markQueryStale(queryClient, queryKeys.workflows.list({ size: 20 }))
		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/workflow'))

		expect(screen.getByRole('button', { name: '고객 문의 자동 분류 열기' })).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '로딩 중' })).not.toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.workflows.list({ size: 20 }) })).toBe(1)
		expect(countRequests(observeRequest, 'workflowList')).toBe(2)
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
	})

	it('/workflow 전체 실패를 인라인 오류와 query error로 재현한다', async () => {
		server.use(...createAllFailureHandlers())
		const { queryClient } = renderAppRoute('/workflow')

		expect(await screen.findByText('워크플로우를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(screen.queryByRole('heading', { level: 2, name: '워크플로우가 아직 없어요' })).not.toBeInTheDocument()
		expect(queryClient.getQueryState(queryKeys.workflows.list({ size: 20 }))?.status).toBe('error')
	})

	it('/workflow retry는 목록 resource만 다시 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['workflowList']))
		renderAppRoute('/workflow')
		await screen.findByText('워크플로우를 불러오지 못했습니다.')

		server.use(...createObservedSuccessHandlers(observeRequest))
		fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })).toBeInTheDocument()
		expect(observeRequest).toHaveBeenCalledTimes(1)
		expect(countRequests(observeRequest, 'workflowList')).toBe(1)
	})

	it('/workflow stale refetch 실패는 기존 목록과 입력을 유지한다', async () => {
		const queryClient = createTestQueryClient()
		renderAppRoute('/workflow', { queryClient })
		await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })
		fireEvent.change(screen.getByPlaceholderText('이름, 서비스 검색'), { target: { value: '고객' } })
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		server.use(...createPartialFailureHandlers(['workflowList']))
		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.workflows.list({ size: 20 }) })
		})

		expect(screen.getByRole('button', { name: '고객 문의 자동 분류 열기' })).toBeInTheDocument()
		expect(screen.getByDisplayValue('고객')).toBeInTheDocument()
		expect(await screen.findByText('업데이트하지 못했습니다.')).toBeInTheDocument()
		expect(screen.queryByText('워크플로우를 불러오지 못했습니다.')).not.toBeInTheDocument()
	})

	it('/inter-setting cold loading과 empty 결과를 재현한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))

		const delayed = renderAppRoute('/inter-setting')
		const integrationSkeleton = screen.getByRole('status', { name: '통합 서비스 불러오는 중' })
		const aiCredentialSkeleton = screen.getByRole('status', { name: 'AI 자격 증명 불러오는 중' })
		expect(integrationSkeleton.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(16)
		expect(aiCredentialSkeleton.querySelectorAll('[data-skeleton-highlight]')).toHaveLength(4)
		expect(screen.queryByText('Slack')).not.toBeInTheDocument()
		expect(await screen.findByText('팀 Slack')).toBeInTheDocument()
		delayed.dispose()

		server.use(...createEmptyHandlers())
		renderAppRoute('/inter-setting')

		expect(await screen.findByText('연결된 서비스가 없습니다.')).toBeInTheDocument()
		expect(screen.queryByText('Google Gemini')).not.toBeInTheDocument()
	})

	it('/inter-setting fresh 재방문은 연결과 AI credential cache를 사용하고 다시 요청하지 않는다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest))
		const { router } = renderAppRoute('/inter-setting', { queryClient })
		await screen.findByText('팀 Slack')
		await screen.findByText('Google Gemini')
		await waitFor(() => {
			expect(queryClient.isFetching({ queryKey: queryKeys.webhookCredentials.list() })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.oauthConnections.list() })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.providers.list() })).toBe(0)
			expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		})
		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/inter-setting'))

		expect(screen.getByText('팀 Slack')).toBeInTheDocument()
		expect(screen.getByText('Google Gemini')).toBeInTheDocument()
		expect(screen.queryByText('연결된 서비스를 불러오는 중…')).not.toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.webhookCredentials.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.oauthConnections.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.providers.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(0)
		expect(countRequests(observeRequest, 'webhookCredentials')).toBe(1)
		expect(countRequests(observeRequest, 'oauthConnections')).toBe(1)
		expect(countRequests(observeRequest, 'providers')).toBe(1)
		expect(countRequests(observeRequest, 'credentials')).toBe(1)
	})

	it('/inter-setting stale 재방문은 기존 데이터를 유지하고 동적 query를 background refetch한다', async () => {
		const queryClient = createTestQueryClient()
		const observeRequest = vi.fn()
		server.use(...createObservedSuccessHandlers(observeRequest, 40))
		const { router } = renderAppRoute('/inter-setting', { queryClient })
		await screen.findByText('팀 Slack')
		await screen.findByText('Google Gemini')
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		markQueryStale(queryClient, queryKeys.webhookCredentials.list())
		markQueryStale(queryClient, queryKeys.oauthConnections.list())
		markQueryStale(queryClient, queryKeys.credentials.list())
		await act(async () => router.navigate('/user'))
		await act(async () => router.navigate('/inter-setting'))

		expect(screen.getByText('팀 Slack')).toBeInTheDocument()
		expect(screen.getByText('Google Gemini')).toBeInTheDocument()
		expect(screen.queryByText('연결된 서비스를 불러오는 중…')).not.toBeInTheDocument()
		expect(queryClient.isFetching({ queryKey: queryKeys.webhookCredentials.list() })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.oauthConnections.list() })).toBe(1)
		expect(queryClient.isFetching({ queryKey: queryKeys.providers.list() })).toBe(0)
		expect(queryClient.isFetching({ queryKey: queryKeys.credentials.list() })).toBe(1)
		expect(countRequests(observeRequest, 'webhookCredentials')).toBe(2)
		expect(countRequests(observeRequest, 'oauthConnections')).toBe(2)
		expect(countRequests(observeRequest, 'providers')).toBe(1)
		expect(countRequests(observeRequest, 'credentials')).toBe(2)
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
	})

	it('/inter-setting source refetch 실패는 기존 connected와 available 목록을 유지한다', async () => {
		const queryClient = createTestQueryClient()
		renderAppRoute('/inter-setting', { queryClient })
		await screen.findByText('팀 Slack')
		await screen.findByText('Notion')
		await waitFor(() => expect(queryClient.isFetching()).toBe(0))
		server.use(...createPartialFailureHandlers(['oauthConnections']))

		await act(async () => {
			await queryClient.refetchQueries({ queryKey: queryKeys.oauthConnections.list() })
		})

		expect(screen.getByText('팀 Slack')).toBeInTheDocument()
		expect(screen.getByText('Notion')).toBeInTheDocument()
		expect(await screen.findByText('일부 연결을 업데이트하지 못했습니다.')).toBeInTheDocument()
		expect(screen.queryByText('연결 상태를 확인하지 못했습니다.')).not.toBeInTheDocument()
	})

	it('/inter-setting 일부 API 실패는 현재 통합 오류 상태를 재현한다', async () => {
		server.use(...createPartialFailureHandlers(['oauthConnections']))

		renderAppRoute('/inter-setting')

		expect(await screen.findByText('연결 상태를 확인하지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('팀 Slack')).toBeInTheDocument()
		expect(screen.queryByText('Notion')).not.toBeInTheDocument()
	})

	it('/inter-setting OAuth retry는 실패한 source만 다시 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['oauthConnections']))
		renderAppRoute('/inter-setting')
		await screen.findByText('연결 상태를 확인하지 못했습니다.')

		server.use(...createObservedSuccessHandlers(observeRequest))
		fireEvent.click(screen.getByRole('button', { name: 'OAuth 연결 다시 시도' }))

		expect(await screen.findByText('Notion')).toBeInTheDocument()
		expect(screen.getByText('팀 Slack')).toBeInTheDocument()
		expect(observeRequest).toHaveBeenCalledTimes(1)
		expect(countRequests(observeRequest, 'oauthConnections')).toBe(1)
	})

	it('/inter-setting AI credential retry는 credential resource만 다시 요청한다', async () => {
		const observeRequest = vi.fn()
		server.use(...createPartialFailureHandlers(['credentials']))
		renderAppRoute('/inter-setting')
		await screen.findByText('AI 자격 증명을 불러오지 못했습니다.')

		server.use(...createObservedSuccessHandlers(observeRequest))
		fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByText('Google Gemini')).toBeInTheDocument()
		expect(observeRequest).toHaveBeenCalledTimes(1)
		expect(countRequests(observeRequest, 'credentials')).toBe(1)
	})

	it('/inter-setting providers 성공 후 credentials loading은 provider 수만큼 shell을 유지한다', async () => {
		server.use(createResourceSuccessHandler('credentials', 80))

		renderAppRoute('/inter-setting')

		const credentialSkeleton = await screen.findByRole('status', { name: 'AI 자격 증명 불러오는 중' })
		expect(credentialSkeleton.querySelectorAll('article')).toHaveLength(1)
		expect(screen.queryByText('미연결')).not.toBeInTheDocument()
		expect(await screen.findByText('Google Gemini')).toBeInTheDocument()
	})

	it('/inter-setting credentials의 성공한 빈 배열만 실제 미등록 상태로 표시한다', async () => {
		server.use(createResourceEmptyHandler('credentials'))

		renderAppRoute('/inter-setting')

		expect(await screen.findByText('Google Gemini')).toBeInTheDocument()
		expect(screen.getByText('미연결')).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/Google Gemini API Key를 입력하세요/)).toBeInTheDocument()
	})

	it('/inter-setting providers의 성공한 빈 배열은 전용 empty 상태로 표시한다', async () => {
		server.use(createResourceEmptyHandler('providers'))

		renderAppRoute('/inter-setting')

		expect(await screen.findByText('등록 가능한 AI 제공자가 없습니다.')).toBeInTheDocument()
		expect(screen.queryByText('Google Gemini')).not.toBeInTheDocument()
	})

	it('/inter-setting providers empty는 credentials loading보다 우선한다', async () => {
		server.use(createResourceEmptyHandler('providers'), createResourceSuccessHandler('credentials', 10_000))

		renderAppRoute('/inter-setting')

		expect(await screen.findByText('등록 가능한 AI 제공자가 없습니다.')).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: 'AI 자격 증명 불러오는 중' })).not.toBeInTheDocument()
	})

	it('/inter-setting providers empty는 credentials 최초 오류보다 우선한다', async () => {
		server.use(createResourceEmptyHandler('providers'), ...createPartialFailureHandlers(['credentials']))

		renderAppRoute('/inter-setting')

		expect(await screen.findByText('등록 가능한 AI 제공자가 없습니다.')).toBeInTheDocument()
		expect(screen.queryByText('AI 자격 증명을 불러오지 못했습니다.')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
	})

	it('/inter-setting 전체 실패를 각 query의 독립 error로 재현한다', async () => {
		server.use(...createAllFailureHandlers())
		const { queryClient } = renderAppRoute('/inter-setting')

		expect(await screen.findByText('연결 상태를 확인하지 못했습니다.')).toBeInTheDocument()
		expect(screen.getByText('AI 제공자 정보를 불러오지 못했습니다.')).toBeInTheDocument()
		await waitFor(() => {
			expect(queryClient.getQueryState(queryKeys.webhookCredentials.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.oauthConnections.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.providers.list())?.status).toBe('error')
			expect(queryClient.getQueryState(queryKeys.credentials.list())?.status).toBe('error')
		})
	})

	it('빠른 연속 route 전환 뒤 마지막 route만 활성화한다', async () => {
		server.use(...createDelayedSuccessHandlers(40))
		const { router } = renderAppRoute('/main')

		await act(async () => {
			void router.navigate('/workflow')
			void router.navigate('/inter-setting')
		})

		await waitFor(() => expect(router.state.location.pathname).toBe('/inter-setting'))
		expect(screen.getByRole('heading', { level: 1, name: '통합 설정' })).toBeInTheDocument()
		expect(screen.queryByRole('heading', { level: 1, name: '대시보드' })).not.toBeInTheDocument()
		expect(await screen.findByText('팀 Slack')).toBeInTheDocument()
	})

	it('services와 aiCredentials scroll navigation의 빠른 변경은 마지막 탭을 유지한다', async () => {
		const scrollTo = vi.spyOn(window, 'scrollTo')
		renderAppRoute('/inter-setting')
		await screen.findByText('팀 Slack')

		const services = screen.getByRole('button', { name: '서비스 관리' })
		const aiCredentials = screen.getByRole('button', { name: 'AI 자격증명' })
		fireEvent.click(aiCredentials)
		fireEvent.click(services)

		expect(services).toHaveClass('bg-main-deep-blue')
		expect(aiCredentials).not.toHaveClass('bg-main-deep-blue')
		expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
		await act(async () => {
			await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
		})
		expect(services).toHaveClass('bg-main-deep-blue')
		expect(aiCredentials).not.toHaveClass('bg-main-deep-blue')
		scrollTo.mockRestore()
	})

	it('두 QueryClient와 runtime handler reset을 직접 격리한다', async () => {
		const failedClient = createTestQueryClient()
		const successClient = createTestQueryClient()
		failedClient.setQueryData(['client-owner'], 'failed-client')
		expect(successClient.getQueryData(['client-owner'])).toBeUndefined()

		server.use(...createPartialFailureHandlers(['workflowList']))
		const failed = renderAppRoute('/workflow', { queryClient: failedClient })
		expect(await screen.findByText('워크플로우를 불러오지 못했습니다.')).toBeInTheDocument()
		expect(failedClient.getQueryState(queryKeys.workflows.list({ size: 20 }))?.status).toBe('error')
		failed.dispose()

		server.resetHandlers()
		renderAppRoute('/workflow', { queryClient: successClient })
		expect(await screen.findByRole('button', { name: '고객 문의 자동 분류 열기' })).toBeInTheDocument()
		expect(successClient.getQueryState(queryKeys.workflows.list({ size: 20 }))?.status).toBe('success')
	})
})
