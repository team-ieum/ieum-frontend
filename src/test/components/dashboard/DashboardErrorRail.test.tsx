import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DashboardErrorRail from '@/components/dashboard/DashboardErrorRail'
import type { DashboardExpandableListState, ErrorRow } from '@/types/dashboard'

const createErrors = (visibleItems: ErrorRow[]): DashboardExpandableListState<ErrorRow> & { errorCount: number } => ({
	visibleItems,
	errorCount: visibleItems.length,
	hasMore: false,
	isExpanded: false,
	resource: { isLoading: false, isRefetching: false, isLoadingError: false, isRefetchError: false, retry: vi.fn() },
	footerLabel: '',
	handleFooterClick: vi.fn(),
})

const executionRow: ErrorRow = {
	id: 'execution-1',
	kind: 'execution',
	workflowId: 'workflow-execution',
	code: 'ERR-111111',
	severity: 'error',
	title: '외부 서비스 응답 지연',
	flow: '메일 요약',
	when: '방금 전',
}

const validationRow: ErrorRow = {
	...executionRow,
	id: 'execution-2',
	kind: 'validation',
	workflowId: 'workflow-validation',
	title: '검증 실패 2건: 메시지를 보낼 채널을 골라 주세요.',
	flow: '고객 문의 자동 분류',
}

describe('DashboardErrorRail 검증 실패 행', () => {
	it('검증 실패 행은 설정 오류 표시와 문제 보기 버튼을 보여 주고, 누르면 그 워크플로우 id로 핸들러를 호출한다', async () => {
		const user = userEvent.setup()
		const handleOpenWorkflowProblems = vi.fn()
		render(
			<DashboardErrorRail
				errors={createErrors([validationRow, executionRow])}
				onOpenWorkflowProblems={handleOpenWorkflowProblems}
			/>
		)

		const validationItem = screen.getByText(validationRow.title).closest('li')
		if (!validationItem) throw new Error('검증 실패 행을 찾지 못했습니다.')
		expect(within(validationItem).getByText('설정 오류')).toBeInTheDocument()

		await user.click(within(validationItem).getByRole('button', { name: '고객 문의 자동 분류 문제 보기' }))

		expect(handleOpenWorkflowProblems).toHaveBeenCalledExactlyOnceWith('workflow-validation')
	})

	it('실행 오류 행에는 설정 오류 표시와 문제 보기 버튼이 없다', () => {
		render(<DashboardErrorRail errors={createErrors([executionRow])} onOpenWorkflowProblems={vi.fn()} />)

		expect(screen.getByText(executionRow.title)).toBeInTheDocument()
		expect(screen.queryByText('설정 오류')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /문제 보기/ })).not.toBeInTheDocument()
	})
})
