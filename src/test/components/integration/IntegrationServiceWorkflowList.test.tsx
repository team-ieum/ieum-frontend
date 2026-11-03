import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IntegrationServiceWorkflowList from '@/components/integration/IntegrationServiceWorkflowList'

// 화면 분기만 확인하므로 조회 훅을 케이스별 고정 상태로 대체한다.
const mocks = vi.hoisted(() => ({ queryState: {} as Record<string, unknown> }))

vi.mock('@/hooks/integration/queries/useIntegrationServiceWorkflowsQuery', () => ({
	useIntegrationServiceWorkflowsQuery: () => mocks.queryState,
}))

const createQueryState = (overrides: Record<string, unknown> = {}) => ({
	data: {
		pages: [
			{
				data: {
					content: ['GMAIL_NEW_EMAIL', 'GITHUB_NEW_ISSUE', 'MANUAL'].map((triggerType, index) => ({
						id: `workflow-${index}`,
						name: `워크플로우 ${index}`,
						description: '',
						active: true,
						triggerType,
						usedNodeCount: 1,
						updatedAt: '2026-10-26T00:00:00Z',
					})),
				},
			},
		],
	},
	isLoading: false,
	isRefetching: false,
	isLoadingError: false,
	isRefetchError: false,
	isFetchingNextPage: false,
	isFetchNextPageError: false,
	hasNextPage: false,
	refetch: vi.fn(),
	fetchNextPage: vi.fn(),
	errorUpdatedAt: 100,
	...overrides,
})

const renderList = () =>
	render(
		<MemoryRouter>
			<IntegrationServiceWorkflowList service={{ id: 'google', name: 'Google', brand: 'gmail', status: 'connected' }} />
		</MemoryRouter>
	)

describe('IntegrationServiceWorkflowList', () => {
	beforeEach(() => {
		mocks.queryState = createQueryState()
	})

	it('앱 트리거를 서비스 문구로 표시한다', () => {
		renderList()

		expect(screen.getByText('Gmail 메일')).toBeInTheDocument()
		expect(screen.getByText('GitHub 이슈')).toBeInTheDocument()
		expect(screen.getByText('수동')).toBeInTheDocument()
	})

	it('다음 페이지 요청이 실패하면 불러온 목록을 유지하고 다시 시도 버튼을 표시한다', () => {
		mocks.queryState = createQueryState({ hasNextPage: true, isFetchNextPageError: true })
		renderList()

		expect(screen.getByText('워크플로우 0')).toBeInTheDocument()
		expect(screen.getByRole('alert')).toHaveTextContent('다음 워크플로우를 불러오지 못했습니다.')
		expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled()
		expect(screen.queryByText('워크플로우 목록을 불러오지 못했습니다.')).not.toBeInTheDocument()
	})

	it('첫 로딩 중에는 개수와 빈 목록 문구 대신 2행 skeleton을 표시한다', () => {
		mocks.queryState = createQueryState({ data: undefined, isLoading: true })
		const { container } = renderList()

		const skeleton = screen.getByRole('status', { name: '연동 워크플로우 불러오는 중' })
		expect(skeleton).toHaveAttribute('aria-busy', 'true')
		expect(skeleton.children).toHaveLength(2)
		expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
		expect(screen.queryByText('이 서비스를 사용하는 워크플로우가 없습니다.')).not.toBeInTheDocument()
		expect(screen.queryByText('0')).not.toBeInTheDocument()
	})

	it('목록 갱신이 실패하면 기존 목록을 유지하고 다시 시도는 목록 전체만 다시 조회한다', async () => {
		const user = userEvent.setup()
		mocks.queryState = createQueryState({ isRefetchError: true, hasNextPage: true })
		renderList()

		expect(screen.getByText('워크플로우 0')).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('최신 목록을 불러오지 못했습니다.')

		await user.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(mocks.queryState.refetch).toHaveBeenCalledTimes(1)
		expect(mocks.queryState.fetchNextPage).not.toHaveBeenCalled()
	})

	it('목록을 백그라운드로 갱신하는 동안에는 헤더에 업데이트 중을 표시한다', () => {
		mocks.queryState = createQueryState({ isRefetching: true })
		renderList()

		expect(screen.getByRole('status')).toHaveTextContent('업데이트 중…')
		expect(screen.getByText('워크플로우 0')).toBeInTheDocument()
	})

	// 다음 페이지 실패 뒤 mount·reconnect 재조회처럼, 갱신 실패를 재시도하지 않았는데 재조회가 시작되면서 TanStack Query가 isRefetchError를 true로 바꾸는 경우다.
	it('사용자가 재시도하지 않은 재조회에서는 오류 상태가 남아 있어도 실패 배너 대신 업데이트 중을 표시한다', () => {
		mocks.queryState = createQueryState({ isRefetchError: true, isRefetching: true })
		renderList()

		expect(screen.getByRole('status')).toHaveTextContent('업데이트 중…')
		expect(screen.queryByText(/최신 목록을/)).not.toBeInTheDocument()
	})

	// 재시도로 배너가 unmount되면 focus가 문서 처음으로 돌아가므로 같은 버튼에 남는지 확인한다.
	it('갱신 실패 배너에서 다시 시도를 누르면 재시도 중에도 배너와 focus를 유지하고 업데이트 중을 중복 표시하지 않는다', async () => {
		const user = userEvent.setup()
		mocks.queryState = createQueryState({ isRefetchError: true })
		const { rerender } = renderList()

		const retryButton = screen.getByRole('button', { name: '다시 시도' })
		await user.click(retryButton)
		mocks.queryState = { ...mocks.queryState, isRefetching: true }
		rerender(
			<MemoryRouter>
				<IntegrationServiceWorkflowList service={{ id: 'google', name: 'Google', brand: 'gmail', status: 'connected' }} />
			</MemoryRouter>
		)

		expect(screen.getByRole('status')).toHaveTextContent('최신 목록을 다시 불러오는 중…')
		expect(screen.queryByText('업데이트 중…')).not.toBeInTheDocument()
		expect(retryButton).toBeInTheDocument()
		expect(retryButton).toHaveFocus()
		expect(retryButton).toHaveAttribute('aria-disabled', 'true')
	})

	it('다음 페이지를 다시 요청하는 동안에는 실패 경고를 숨기고 버튼을 비활성화한다', () => {
		mocks.queryState = createQueryState({ hasNextPage: true, isFetchNextPageError: true, isFetchingNextPage: true })
		renderList()

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '불러오는 중…' })).toBeDisabled()
	})

	it('첫 페이지 조회가 실패하면 목록 대신 전체 오류와 다시 시도를 표시한다', async () => {
		const user = userEvent.setup()
		mocks.queryState = createQueryState({ data: undefined, isLoadingError: true })
		renderList()

		const alert = screen.getByRole('alert')
		expect(alert).toHaveTextContent('워크플로우 목록을 불러오지 못했습니다.')
		expect(screen.queryByRole('list')).not.toBeInTheDocument()

		await user.click(within(alert).getByRole('button', { name: '다시 시도' }))

		expect(mocks.queryState.refetch).toHaveBeenCalledTimes(1)
	})
})
