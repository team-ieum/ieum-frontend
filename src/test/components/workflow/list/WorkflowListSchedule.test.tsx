import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkflowListCard from '@/components/workflow/list/WorkflowListCard'
import WorkflowListTable from '@/components/workflow/list/WorkflowListTable'
import type { WorkflowListRowView } from '@/types/workflowList'

const scheduleRow: WorkflowListRowView = {
	id: 'workflow-1',
	name: '주간 문의 요약',
	services: [],
	serviceNamesLabel: '',
	hasServices: false,
	nodeCount: 2,
	updatedAtRelative: '방금 전',
	status: 'active',
	statusBarClass: '',
	trigger: 'schedule',
	cronExpression: '0 9 * * 1',
	scheduleLabel: '오전 09:00, 월요일에만',
}

describe('워크플로우 목록 스케줄 표시', () => {
	it('카드 보기는 cron 대신 스케줄 문장을 보여 주고 원문은 title로 남긴다', () => {
		render(<WorkflowListCard workflow={scheduleRow} onOpen={vi.fn()} onDelete={vi.fn()} />)

		expect(screen.getByText('오전 09:00, 월요일에만')).toHaveAttribute('title', '0 9 * * 1')
		expect(screen.queryByText('0 9 * * 1')).not.toBeInTheDocument()
	})

	it('행 보기는 cron 대신 스케줄 문장을 보여 주고 원문은 title로 남긴다', () => {
		render(<WorkflowListTable workflows={[scheduleRow]} onOpen={vi.fn()} onDelete={vi.fn()} />)

		expect(screen.getByText('오전 09:00, 월요일에만')).toHaveAttribute('title', '0 9 * * 1')
		expect(screen.queryByText('0 9 * * 1')).not.toBeInTheDocument()
	})
})
