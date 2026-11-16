import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import type { CredentialItem, ProviderModel } from '@/types/credential'

const chat = vi.hoisted(() => ({
	messages: [] as { type: string; body: string }[],
	credentials: [] as CredentialItem[],
	selectedCredentialId: null as string | null,
	availableModels: [] as ProviderModel[],
	selectedModelId: null as string | null,
	setSelectedModelId: vi.fn(),
}))

vi.mock('@/hooks/workflow/useWorkflowChat', () => ({
	useWorkflowChat: () => ({
		messages: chat.messages,
		input: '',
		setInput: vi.fn(),
		isTyping: false,
		handleSend: vi.fn(),
		handleKeyDown: vi.fn(),
		bodyRef: { current: null },
		credentials: chat.credentials,
		selectedCredentialId: chat.selectedCredentialId,
		setSelectedCredentialId: vi.fn(),
		availableModels: chat.availableModels,
		selectedModelId: chat.selectedModelId,
		setSelectedModelId: chat.setSelectedModelId,
		currentStage: null,
	}),
}))

const START_HINT = 'AI에게 원하는 자동화를 말하면 워크플로우를 만들어 드려요.'

const CLAUDE_CREDENTIAL: CredentialItem = {
	id: 'credential-claude',
	provider: 'CLAUDE',
	credentialType: 'API_KEY',
	displayName: '내 Claude 키',
	keyHint: 'sk-…1234',
	lastValidatedAt: '2026-11-01T00:00:00Z',
	createdAt: '2026-11-01T00:00:00Z',
	valid: true,
}

const createModel = (id: string, displayName: string, isDefault = false): ProviderModel => ({
	id,
	displayName,
	capabilities: ['text'],
	maxOutputTokens: 8192,
	contextWindow: 200000,
	...(isDefault ? { default: true } : {}),
})

beforeEach(() => {
	chat.messages = []
	chat.credentials = []
	chat.selectedCredentialId = null
	chat.availableModels = []
	chat.selectedModelId = null
	chat.setSelectedModelId.mockClear()
})

describe('WorkflowChat 시작 안내', () => {
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

	it('열림 상태를 넘기면 그 값으로 열고 닫으며 FAB·닫기 버튼은 onOpenChange로 알린다', async () => {
		const user = userEvent.setup()
		const onOpenChange = vi.fn()
		const { rerender } = render(
			<WorkflowChat
				workflowId='workflow-1'
				currentNodes={[]}
				currentEdges={[]}
				isOpen={false}
				onOpenChange={onOpenChange}
			/>
		)

		await user.click(screen.getByRole('button', { name: '채팅 열기' }))
		expect(onOpenChange).toHaveBeenLastCalledWith(true)
		// 호출자가 값을 바꾸기 전에는 닫힌 채로 둔다.
		expect(screen.getByRole('button', { name: '채팅 열기' })).toBeInTheDocument()

		rerender(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} isOpen onOpenChange={onOpenChange} />)
		expect(screen.getByRole('button', { name: '채팅 닫기' })).toBeInTheDocument()
		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())

		await user.click(screen.getByRole('button', { name: '채팅 닫기' }))
		expect(onOpenChange).toHaveBeenLastCalledWith(false)
	})
})

describe('WorkflowChat 모델 선택', () => {
	it('자격 증명을 고르면 그 옆에 선택된 모델을 보여 주고, 메뉴에서 기본 모델을 표시하며 다른 모델을 고를 수 있다', async () => {
		chat.credentials = [CLAUDE_CREDENTIAL]
		chat.selectedCredentialId = CLAUDE_CREDENTIAL.id
		chat.availableModels = [
			createModel('claude-sonnet-5-5', 'Claude Sonnet 5.5', true),
			createModel('claude-opus-5-5', 'Claude Opus 5.5'),
		]
		chat.selectedModelId = 'claude-sonnet-5-5'
		const user = userEvent.setup()
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} isOpen />)

		const modelButton = screen.getByRole('button', { name: '세부 모델 선택: Claude Sonnet 5.5' })
		await user.click(modelButton)

		const menu = screen.getByRole('menu')
		expect(within(menu).getByRole('menuitemradio', { name: /Claude Sonnet 5.5/ })).toHaveAttribute('aria-checked', 'true')
		expect(within(menu).getByRole('menuitemradio', { name: /Claude Sonnet 5.5/ })).toHaveTextContent('기본')

		await user.click(within(menu).getByRole('menuitemradio', { name: 'Claude Opus 5.5' }))

		expect(chat.setSelectedModelId).toHaveBeenCalledWith('claude-opus-5-5')
		// jsdom에서는 메뉴의 exit 애니메이션이 끝나지 않아 DOM 제거 대신 버튼의 펼침 상태로 닫힘을 확인한다.
		expect(modelButton).toHaveAttribute('aria-expanded', 'false')
	})

	it('자격 증명을 고르지 않으면 모델 선택창을 보여 주지 않는다', () => {
		chat.credentials = [CLAUDE_CREDENTIAL]
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} isOpen />)

		expect(screen.getByRole('button', { name: 'AI 모델 선택' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /세부 모델 선택/ })).not.toBeInTheDocument()
	})

	it('AI 제공자 메뉴에는 등록한 자격 증명만 있고 선택 안 함은 없다', async () => {
		chat.credentials = [CLAUDE_CREDENTIAL]
		const user = userEvent.setup()
		render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} isOpen />)

		await user.click(screen.getByRole('button', { name: 'AI 모델 선택' }))

		const items = within(screen.getByRole('menu')).getAllByRole('menuitemradio')
		expect(items.map(item => item.textContent)).toEqual(['Claude'])
	})
})
