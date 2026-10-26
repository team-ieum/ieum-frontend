import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import IntegrationServiceWorkflowList from '@/components/integration/IntegrationServiceWorkflowList'

// 트리거 라벨 변환만 확인하므로 조회 훅을 고정 응답으로 대체한다.
vi.mock('@/hooks/integration/queries/useIntegrationServiceWorkflowsQuery', () => ({
	useIntegrationServiceWorkflowsQuery: () => ({
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
		isError: false,
		hasNextPage: false,
		isFetchingNextPage: false,
		fetchNextPage: vi.fn(),
	}),
}))

describe('IntegrationServiceWorkflowList', () => {
	it('앱 트리거를 서비스 문구로 표시한다', () => {
		render(
			<MemoryRouter>
				<IntegrationServiceWorkflowList service={{ id: 'google', name: 'Google', brand: 'gmail', status: 'connected' }} />
			</MemoryRouter>
		)

		expect(screen.getByText('새 Gmail 메일')).toBeInTheDocument()
		expect(screen.getByText('새 GitHub 이슈')).toBeInTheDocument()
		expect(screen.getByText('수동')).toBeInTheDocument()
	})
})
