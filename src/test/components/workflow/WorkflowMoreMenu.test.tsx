import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowMoreMenu } from '@/components/workflow/list/WorkflowMoreMenu'

const getTrigger = () => screen.getByRole('button', { name: '워크플로우 메뉴' })

describe('WorkflowMoreMenu', () => {
	it('trigger가 menu popup 상태를 전달하고 열리면 첫 메뉴 항목으로 focus를 옮긴다', async () => {
		const user = userEvent.setup()
		render(<WorkflowMoreMenu onDelete={vi.fn()} />)

		expect(getTrigger()).toHaveAttribute('aria-haspopup', 'menu')
		expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		await user.click(getTrigger())

		const menu = screen.getByRole('menu', { name: '워크플로우 메뉴' })
		expect(getTrigger()).toHaveAttribute('aria-expanded', 'true')
		expect(getTrigger()).toHaveAttribute('aria-controls', menu.id)
		expect(screen.getByRole('menuitem', { name: '삭제' })).toHaveFocus()
	})

	it('Escape로 닫고 trigger로 focus를 되돌린다', async () => {
		const user = userEvent.setup()
		render(<WorkflowMoreMenu onDelete={vi.fn()} />)

		getTrigger().focus()
		await user.keyboard('{Enter}')
		await user.keyboard('{Escape}')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
		expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
		expect(getTrigger()).toHaveFocus()
	})

	it('keyboard로 메뉴 항목을 선택하면 삭제를 요청하고 닫는다', async () => {
		const user = userEvent.setup()
		const onDelete = vi.fn()
		render(<WorkflowMoreMenu onDelete={onDelete} />)

		getTrigger().focus()
		await user.keyboard('{Enter}')
		await user.keyboard('{Enter}')

		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('focus가 메뉴 밖으로 이동하면 닫는다', async () => {
		const user = userEvent.setup()
		render(
			<>
				<WorkflowMoreMenu onDelete={vi.fn()} />
				<button type='button'>다음 요소</button>
			</>
		)

		await user.click(getTrigger())
		await user.tab()

		expect(screen.getByRole('button', { name: '다음 요소' })).toHaveFocus()
		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})
