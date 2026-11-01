import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkflowChat from '@/components/workflow/WorkflowChat'

const chat = vi.hoisted(() => ({ messages: [] as { type: string; body: string }[] }))

vi.mock('@/hooks/workflow/useWorkflowChat', () => ({
	useWorkflowChat: () => ({
		messages: chat.messages,
		input: '',
		setInput: vi.fn(),
		isTyping: false,
		handleSend: vi.fn(),
		handleKeyDown: vi.fn(),
		bodyRef: { current: null },
		credentials: [],
		selectedCredentialId: null,
		setSelectedCredentialId: vi.fn(),
		currentStage: null,
	}),
}))

const START_HINT = 'AI에게 원하는 자동화를 말하면 워크플로우를 만들어 드려요.'

describe('WorkflowChat 시작 안내', () => {
	beforeEach(() => {
		chat.messages = []
	})

	it('노드가 없으면 닫힌 채팅 버튼 아래에 AI 생성 안내를 띄우고, 채팅을 연 동안에는 숨긴다', async () => {
		const user = userEvent.setup()
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} showsStartHint />)

		// FAB이 커지는 동안 빈 자리를 가리키지 않도록 처음에는 보이지 않다가 나타난다.
		expect(screen.getByRole('note')).toHaveTextContent(START_HINT)
		expect(screen.getByRole('note')).toHaveStyle({ opacity: '0' })
		await waitFor(() => expect(screen.getByRole('note')).toHaveStyle({ opacity: '1' }))

		await user.click(screen.getByRole('button', { name: '채팅 열기' }))
		expect(screen.queryByRole('note')).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: '채팅 닫기' }))
		expect(screen.getByRole('note')).toHaveTextContent(START_HINT)
	})

	it('AI에 요청을 보낸 대화가 있으면 노드가 없어도 닫힌 채팅에 시작 안내를 다시 띄우지 않는다', () => {
		chat.messages = [{ type: 'user', body: '슬랙 알림 만들어 줘' }]
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} showsStartHint />)

		expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()
		expect(screen.queryByRole('note')).not.toBeInTheDocument()
	})

	it('시작 안내를 켜지 않으면 말풍선을 띄우지 않는다', () => {
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} />)

		expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()
		expect(screen.queryByRole('note')).not.toBeInTheDocument()
	})
})
