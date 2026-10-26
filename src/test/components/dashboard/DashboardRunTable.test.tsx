import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DashboardRunTable from '@/components/dashboard/DashboardRunTable'
import type { DashboardExpandableListState, RunRow } from '@/types/dashboard'

const createRuns = (visibleItems: RunRow[]): DashboardExpandableListState<RunRow> => ({
	visibleItems,
	hasMore: false,
	isExpanded: false,
	resource: { isLoading: false, isRefetching: false, isLoadingError: false, isRefetchError: false, retry: vi.fn() },
	footerLabel: '',
	handleFooterClick: vi.fn(),
})

const baseRow: RunRow = {
	id: 'run-1',
	displayId: 'RUN-1',
	name: '메일 요약',
	status: 'success',
	time: '3초',
	trigger: '수동',
	when: '방금 전',
}

describe('DashboardRunTable 트리거 칩', () => {
	it('앱 트리거 칩은 브랜드 로고와 라벨을 함께 표시한다', () => {
		render(
			<DashboardRunTable
				runs={createRuns([
					{ ...baseRow, id: 'run-gmail', trigger: '새 Gmail 메일', triggerBrand: 'gmail' },
					{ ...baseRow, id: 'run-manual' },
				])}
			/>
		)

		const gmailChip = screen.getByText('새 Gmail 메일')
		expect(within(gmailChip).getByRole('img', { hidden: true, name: 'Gmail 로고' })).toBeInTheDocument()
		expect(within(screen.getByText('수동')).queryByRole('img', { hidden: true })).not.toBeInTheDocument()
	})
})
