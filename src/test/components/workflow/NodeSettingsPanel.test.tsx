import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement, type ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import { providersResponse } from '@/mocks/fixtures/aiCredentials'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { server } from '@/mocks/server'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { NodeOption } from '@/types/nodeOptions'
import type { WorkflowNodeDto } from '@/types/workflowList'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const mocks = vi.hoisted(() => ({
	entries: undefined as NodeCatalogEntry[] | undefined,
	isError: false,
	refetch: vi.fn(),
}))

vi.mock('@/hooks/workflow/queries/useNodeCatalogQuery', () => ({
	useNodeCatalogQuery: () => ({
		data: mocks.entries ? { data: { entries: mocks.entries } } : undefined,
		isPending: !mocks.entries && !mocks.isError,
		isError: mocks.isError,
		isFetching: false,
		refetch: mocks.refetch,
	}),
}))

// 실제 카탈로그 fixture에 없는 type 위젯을 함께 확인하려고 칸 type별 항목을 따로 만든다.
const typedEntry: NodeCatalogEntry = {
	id: 'test.typed',
	kind: 'action',
	provider: 'ieum',
	app: 'test',
	appTitle: '테스트',
	nodeType: 'ACTION',
	title: '여러 칸 작업',
	fixed: { type: 'ACTION', event: 'test.typed', config: { brand: 'ieum' } },
	inputFields: [
		{ key: 'count', title: '개수', type: 'integer', required: true, path: 'config.count' },
		{ key: 'notify', title: '알림', type: 'boolean', path: 'config.notify' },
		{ key: 'payload', title: '본문 JSON', type: 'json', path: 'config.payload' },
		{ key: 'headers', title: '헤더', type: 'dict', ref: false, path: 'config.headers' },
		{ key: 'tools', title: '도구', type: 'object', list: true, ref: false, path: 'config.tools' },
	],
	outputFields: [],
}

const createNode = (overrides: Partial<WorkflowNodeDto> = {}): WorkflowNodeDto => ({
	id: 'node-1',
	type: 'ACTION',
	event: 'slack_bot.send_channel_message',
	label: '요약 보내기',
	config: { brand: 'slack' },
	...overrides,
})

// 노드 테스트 영역은 `NodeTestSection.test.tsx`에서 확인한다. 여기서는 필수 props만 채운다.
const nodeTestProps = { workflowId: 'workflow-1', nodes: [], edges: [], onNodeOpen: () => undefined }

// 드롭다운 칸이 options·providers query와 통합 설정 링크를 쓰므로 QueryClient와 router를 함께 둔다.
const renderWithProviders = (ui: ReactElement) => {
	const queryClient = createTestQueryClient()
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{children}</MemoryRouter>
		</QueryClientProvider>
	)
	return render(ui, { wrapper: Wrapper })
}

/** 페이지처럼 바뀐 노드를 다시 넘겨 연속 입력을 확인한다. */
const Harness = ({
	initialNode,
	onNodeChange,
}: {
	initialNode: WorkflowNodeDto
	onNodeChange: (node: WorkflowNodeDto) => void
}) => {
	const [node, setNode] = useState(initialNode)
	return (
		<NodeSettingsPanel
			{...nodeTestProps}
			node={node}
			onNodeChange={next => {
				setNode(next)
				onNodeChange(next)
			}}
			onClose={() => undefined}
		/>
	)
}

// 입력 방식 radiogroup도 칸 이름으로 시작하는 aria-label을 가져 입력 요소만 고른다. 목록 칸은 button이다.
const getFieldInput = (title: string) =>
	screen.getByLabelText(new RegExp(`^${title}`), { selector: 'input, textarea, select, button' })

/** 설정 드롭다운을 열고 `{title} 목록`에서 항목을 고른다. options 목록은 열린 뒤 응답이 와야 항목이 생겨 항목도 기다린다. */
const chooseFromDropdown = async (user: ReturnType<typeof userEvent.setup>, title: string, optionName: string | RegExp) => {
	await user.click(getFieldInput(title))
	const listbox = await screen.findByRole('listbox', { name: `${title} 목록` })
	await user.click(await within(listbox).findByRole('option', { name: optionName }))
}

const renderPanel = (initialNode: WorkflowNodeDto) => {
	const onNodeChange = vi.fn()
	renderWithProviders(<Harness initialNode={initialNode} onNodeChange={onNodeChange} />)
	return { onNodeChange, lastNode: () => onNodeChange.mock.lastCall?.[0] as WorkflowNodeDto }
}

describe('NodeSettingsPanel', () => {
	beforeEach(() => {
		mocks.entries = [...nodeCatalogEntriesFixture, typedEntry]
		mocks.isError = false
		mocks.refetch.mockReset()
	})

	it('카탈로그 inputFields 순서대로 칸을 보여 주고 필수 칸이 비면 경고만 한다', () => {
		renderPanel(createNode())

		expect(screen.getByRole('complementary', { name: '노드 설정' })).toHaveFocus()
		expect(screen.getByRole('heading', { name: '요약 보내기' })).toBeInTheDocument()
		const labels = screen.getAllByText(/^(채널|메시지|스레드)/, { selector: 'label' })
		expect(labels.map(label => label.firstChild?.textContent)).toEqual(['채널', '메시지', '스레드'])
		expect(screen.getByText(/필수 칸 2개가 비어 있어요/)).toHaveAttribute('role', 'status')
		expect(getFieldInput('채널')).toHaveAccessibleDescription(/필수 칸이 비어 있어요/)
	})

	it('문자열 칸 입력을 path에 쓰고 폼에 없는 config 키를 보존하며 비우면 키를 지운다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode({ config: { brand: 'slack', unknownKey: 1 } }))

		await user.type(getFieldInput('메시지'), '안녕 {{{{nodes.a.output.text}}')
		expect(lastNode().config).toEqual({ brand: 'slack', unknownKey: 1, text: '안녕 {{nodes.a.output.text}}' })

		await user.clear(getFieldInput('메시지'))
		expect(lastNode().config).toEqual({ brand: 'slack', unknownKey: 1 })
	})

	it('default는 placeholder로만 보여 주고 저장하지 않으며 기본값이 있는 필수 칸은 경고하지 않는다', () => {
		mocks.entries = [
			{
				...typedEntry,
				inputFields: [
					{ key: 'limit', title: '최대 개수', type: 'integer', required: true, default: 20, path: 'config.limit' },
				],
			},
		]
		const { onNodeChange } = renderPanel(createNode({ event: 'test.typed', config: {} }))

		expect(getFieldInput('최대 개수')).toHaveAttribute('placeholder', '기본값: 20')
		expect(screen.queryByText(/필수 칸 \d+개가 비어 있어요/)).not.toBeInTheDocument()
		expect(onNodeChange).not.toHaveBeenCalled()
	})

	it('choices 칸은 브라우저 기본 select 대신 설정 드롭다운으로 id를 저장하고 참조식을 쓸 수 없으면 입력 방식을 숨긴다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode({ type: 'HTTP', event: 'http.request', config: {} }))

		expect(screen.queryByRole('radiogroup', { name: 'Method 입력 방식' })).not.toBeInTheDocument()
		expect(screen.queryByRole('combobox', { name: /^Method/ })).toHaveTextContent('선택 안 함')
		expect(document.querySelector('select')).toBeNull()
		await chooseFromDropdown(user, 'Method', 'POST')
		expect(lastNode().config).toEqual({ method: 'POST' })
		expect(getFieldInput('Method')).toHaveTextContent('POST')

		await user.click(getFieldInput('Method'))
		const listbox = screen.getByRole('listbox', { name: 'Method 목록' })
		expect(within(listbox).getByRole('option', { name: 'POST' })).toHaveClass('bg-main-light-blue')
		await user.click(within(listbox).getByRole('option', { name: '선택 안 함' }))
		expect(lastNode().config).toEqual({})
	})

	it('choices에 없는 저장값은 지우지 않고 목록에 없는 값으로 보여 준다', async () => {
		const user = userEvent.setup()
		const { onNodeChange } = renderPanel(createNode({ type: 'HTTP', event: 'http.request', config: { method: 'TRACE' } }))

		expect(getFieldInput('Method')).toHaveTextContent('목록에 없는 값 (TRACE)')
		await chooseFromDropdown(user, 'Method', '목록에 없는 값 (TRACE)')
		expect(onNodeChange).not.toHaveBeenCalled()
	})

	it('참조식을 쓸 수 없는 칸은 {{ 입력을 받지 않고 이유를 알린다', async () => {
		const user = userEvent.setup()
		mocks.entries = [
			{
				...typedEntry,
				inputFields: [{ key: 'path', title: '경로', type: 'string', ref: false, path: 'config.path' }],
			},
		]
		const { lastNode } = renderPanel(createNode({ event: 'test.typed', config: {} }))

		const input = getFieldInput('경로')
		await user.type(input, 'a{{{{')

		expect(input).toHaveValue('a{')
		expect(screen.getByRole('alert')).toHaveTextContent('이 칸에는 참조식을 쓸 수 없어요.')
		expect(lastNode().config).toEqual({ path: 'a{' })
	})

	it('integer는 숫자로 저장하고 잘못된 입력은 편집 문서에 넣지 않는다', async () => {
		const user = userEvent.setup()
		const { onNodeChange, lastNode } = renderPanel(createNode({ type: 'ACTION', event: 'test.typed', config: {} }))

		const count = getFieldInput('개수')
		await user.type(count, '12')
		expect(lastNode().config).toEqual({ count: 12 })

		const callCount = onNodeChange.mock.calls.length
		await user.type(count, '.5')
		expect(screen.getByRole('alert')).toHaveTextContent('정수를 입력해 주세요.')
		expect(count).toHaveAttribute('aria-invalid', 'true')
		// '12.'은 정수가 아니라 넘기지 않고, '12.5'도 마찬가지다.
		expect(onNodeChange).toHaveBeenCalledTimes(callCount)
	})

	it('참조식 방식으로 바꾸면 이전 값을 비우고 {{가 있는 참조식만 저장한다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode({ type: 'ACTION', event: 'test.typed', config: { count: 3 } }))

		const modes = screen.getByRole('radiogroup', { name: '개수 입력 방식' })
		await user.click(within(modes).getByRole('radio', { name: '참조식' }))
		expect(within(modes).getByRole('radio', { name: '참조식' })).toHaveAttribute('aria-checked', 'true')
		expect(lastNode().config).toEqual({})

		const count = getFieldInput('개수')
		await user.type(count, '{{{{nodes.a.output.n}}')
		expect(lastNode().config).toEqual({ count: '{{nodes.a.output.n}}' })
	})

	it('boolean·json·dict 칸을 저장할 모양으로 넘기고 object 칸은 읽기 전용으로 보존한다', async () => {
		const user = userEvent.setup()
		const tools = [{ name: 'builtin:slack_send_channel_message', config: {} }]
		const { lastNode } = renderPanel(createNode({ type: 'ACTION', event: 'test.typed', config: { tools } }))

		await chooseFromDropdown(user, '알림', '아니요')
		expect(lastNode().config).toMatchObject({ notify: false })

		fireEvent.change(getFieldInput('본문 JSON'), { target: { value: '{"a":1}' } })
		expect(lastNode().config).toMatchObject({ payload: '{"a":1}' })

		await user.click(screen.getByRole('button', { name: '항목 추가' }))
		await user.type(screen.getByLabelText('헤더 1번째 키'), 'X-Id')
		await user.type(screen.getByLabelText('헤더 1번째 값'), 'abc')
		expect(lastNode().config).toMatchObject({ headers: { 'X-Id': 'abc' } })
		await user.click(screen.getByRole('button', { name: '헤더 1번째 항목 삭제' }))
		expect(lastNode().config).not.toHaveProperty('headers')

		expect(screen.getByText(/1개 설정됨. 이 칸은 아직 화면에서 바꿀 수 없어요/)).toBeInTheDocument()
		expect(lastNode().config.tools).toBe(tools)
	})

	describe('AI 도구 칸', () => {
		const SLACK_TOOL = 'builtin:slack_send_channel_message'
		const SLACK_TITLE = 'Slack 채널에 메시지 보내기'
		const DISCORD_TITLE = 'Discord 웹훅으로 보내기'

		// 필수 칸 개수를 도구 칸만으로 확인하려고 AI 공통 필수 칸(제공자·프롬프트)은 채워 둔다.
		const createAiNode = (event: 'ai.reasoning' | 'ai.agent', tools: unknown[] = []) =>
			createNode({
				type: 'AI',
				event,
				label: '요약',
				config: {
					agentType: event === 'ai.agent' ? 'react' : 'simple',
					credentialId: '',
					tools,
					brand: 'openai',
					llmProvider: 'CLAUDE',
					prompt: '요약해줘',
				},
			})

		const getToolsSection = () => screen.getByRole('region', { name: '도구' })
		// 펼치기 버튼 이름은 도구 이름으로 시작하고, 같은 이름으로 시작하는 '도구 빼기' 버튼은 뺀다.
		const getToolToggle = (title: string) =>
			within(getToolsSection()).getByRole('button', { name: new RegExp(`^${title}(?!.*도구 빼기$)`) })
		const getToolCard = (title: string) => getToolToggle(title).closest('li') as HTMLElement

		const openAddList = async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole('combobox', { name: '도구 추가' }))
			return screen.findByRole('listbox', { name: '도구 목록' })
		}

		it('도구 없는 AI 노드에서 도구를 고르면 ai.agent로 바꿔 {name, config} 원소로 저장하고 방금 추가한 도구를 펼친다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createAiNode('ai.reasoning'))

			expect(screen.getByText('AI 답변 만들기')).toBeInTheDocument()
			expect(getToolsSection()).toHaveTextContent('도구를 고르면 고른 도구를 써 가며 일하는 AI 에이전트로 바뀌어요.')

			const listbox = await openAddList(user)
			expect(within(listbox).getByRole('option', { name: new RegExp(`^${SLACK_TITLE}`) })).toBeInTheDocument()
			await user.click(within(listbox).getByRole('option', { name: new RegExp(`^${DISCORD_TITLE}`) }))

			expect(lastNode().event).toBe('ai.agent')
			expect(lastNode().config).toEqual({
				agentType: 'react',
				credentialId: '',
				tools: [{ name: 'discord', config: {} }],
				brand: 'openai',
				llmProvider: 'CLAUDE',
				prompt: '요약해줘',
			})
			expect(screen.getByText('AI 에이전트')).toBeInTheDocument()
			expect(getToolToggle(DISCORD_TITLE)).toHaveAttribute('aria-expanded', 'true')
			expect(within(getToolCard(DISCORD_TITLE)).getByText(/^보낸 사람 이름/, { selector: 'label' })).toBeInTheDocument()

			// 이미 고른 도구는 추가 목록에서 빠진다.
			const nextList = await openAddList(user)
			expect(
				within(nextList)
					.getAllByRole('option')
					.map(option => option.textContent)
			).toEqual([`${SLACK_TITLE}Slack`, '캘린더 일정 수정Google Calendar'])
		})

		it('저장된 도구는 접어 두고, 펼친 도구 칸 값을 그 원소 config에 쓰며 비우면 키를 지우고 AI가 정한다고 안내한다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createAiNode('ai.agent', [{ name: SLACK_TOOL, config: {} }]))

			expect(getToolToggle(SLACK_TITLE)).toHaveAttribute('aria-expanded', 'false')
			expect(screen.queryByText(/^메시지/, { selector: 'label' })).not.toBeInTheDocument()
			await user.click(getToolToggle(SLACK_TITLE))

			const card = getToolCard(SLACK_TITLE)
			expect(within(card).getAllByText('비우면 AI가 정해요')).toHaveLength(3)
			await user.type(getFieldInput('메시지'), '안녕')
			expect(lastNode().config.tools).toEqual([{ name: SLACK_TOOL, config: { text: '안녕' } }])

			await user.clear(getFieldInput('메시지'))
			expect(lastNode().config.tools).toEqual([{ name: SLACK_TOOL, config: {} }])
		})

		it('마지막 도구를 빼면 원소를 지우고 ai.reasoning으로 되돌린다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createAiNode('ai.agent', [{ name: SLACK_TOOL, config: { text: '안녕' } }]))

			expect(getToolsSection()).toHaveTextContent('도구를 모두 빼면 도구 없이 답만 만드는 AI로 바뀌어요.')
			await user.click(screen.getByRole('button', { name: `${SLACK_TITLE} 도구 빼기` }))

			expect(lastNode().event).toBe('ai.reasoning')
			expect(lastNode().config).toMatchObject({ agentType: 'simple', tools: [] })
			expect(within(getToolsSection()).queryByRole('listitem')).not.toBeInTheDocument()
			expect(screen.getByText('AI 답변 만들기')).toBeInTheDocument()
		})

		it('도구 없는 ai.agent는 바뀐다고 안내하지 않고 도구 칸 필수 경고도 하지 않는다', () => {
			// 팔레트의 'AI 에이전트'와 GitHub 프리셋은 도구 없이 ai.agent로 저장된다.
			renderPanel(createAiNode('ai.agent'))

			expect(getToolsSection()).toHaveTextContent('도구를 고르면 AI가 고른 도구를 써 가며 일해요.')
			expect(getToolsSection()).not.toHaveTextContent('바뀌어요')
			expect(screen.queryByText(/필수 칸 \d+개가 비어 있어요/)).not.toBeInTheDocument()
		})

		it('AI에게 맡길 수 없는 웹훅 칸은 비면 필수 경고를 하고 카드를 접어도 알린다', async () => {
			const user = userEvent.setup()
			renderPanel(createAiNode('ai.agent', [{ name: 'discord', config: {} }]))

			expect(screen.getByText(/필수 칸 1개가 비어 있어요/)).toHaveAttribute('role', 'status')
			expect(getToolToggle(DISCORD_TITLE)).toHaveTextContent('필수 칸 비어 있음')

			await user.click(getToolToggle(DISCORD_TITLE))
			expect(getFieldInput('웹훅')).toHaveAccessibleDescription(/필수 칸이 비어 있어요/)
			// 웹훅을 뺀 메시지·보낸 사람 이름 칸만 AI 결정 안내를 한다.
			expect(within(getToolCard(DISCORD_TITLE)).getAllByText('비우면 AI가 정해요')).toHaveLength(2)
		})

		it('목록에 없는 도구는 이름만 보여 주고 보존하며, 문자열 원소는 칸을 처음 쓸 때 객체 원소로 바꾼다', async () => {
			const user = userEvent.setup()
			const mcpTool = { name: 'mcp', config: { serverId: 's1' } }
			const { lastNode } = renderPanel(createAiNode('ai.agent', [mcpTool, 'discord']))

			await user.click(getToolToggle('mcp'))
			expect(getToolCard('mcp')).toHaveTextContent('목록에 없는 도구라 화면에서 칸을 바꿀 수 없어요.')

			await user.click(getToolToggle(DISCORD_TITLE))
			await user.type(getFieldInput('메시지'), 'a')
			expect(lastNode().config.tools).toEqual([mcpTool, { name: 'discord', config: { content: 'a' } }])
		})

		it('도구 칸 목록에서 고르면 그 도구 config의 _names에 이름을 남긴다', async () => {
			const user = userEvent.setup()
			server.use(
				http.get('*/api/v1/integrations/:app/options/:resource', () =>
					HttpResponse.json({
						success: true,
						message: 'OK',
						code: 'OK',
						data: { items: [{ id: 'C2', name: '#random' }], nextCursor: null },
					})
				)
			)
			const { lastNode } = renderPanel(createAiNode('ai.agent', [{ name: SLACK_TOOL, config: {} }]))

			await user.click(getToolToggle(SLACK_TITLE))
			await user.click(getFieldInput('채널'))
			await user.click(await screen.findByRole('option', { name: /#random/ }))

			expect(lastNode().config.tools).toEqual([
				{ name: SLACK_TOOL, config: { channel: 'C2', _names: { channel: '#random' } } },
			])
		})

		it('Calendar 수정 도구 카드는 적용 범위·참석자 알림만 보여 주고 숨긴 칸 값은 그대로 둔다', async () => {
			const user = userEvent.setup()
			const CALENDAR_TOOL = 'builtin:google_calendar_update'
			const { lastNode } = renderPanel(
				createAiNode('ai.agent', [{ name: CALENDAR_TOOL, config: { attendees: 'a@example.com' } }])
			)

			await user.click(getToolToggle('캘린더 일정 수정'))
			const card = getToolCard('캘린더 일정 수정')
			expect(
				within(card)
					.getAllByText(/./, { selector: 'label' })
					.map(label => label.textContent)
			).toEqual(['적용 범위', '참석자 알림'])
			expect(within(card).queryByText('비우면 AI가 정해요')).not.toBeInTheDocument()

			await chooseFromDropdown(user, '적용 범위', '반복 전체')
			expect(lastNode().config.tools).toEqual([
				{ name: CALENDAR_TOOL, config: { attendees: 'a@example.com', scope: 'all' } },
			])
		})

		describe('출력 칸과의 충돌', () => {
			const OUTPUT_FIELDS = [{ key: 'urgent', type: 'boolean' }]
			const withOutputFields = (node: WorkflowNodeDto) => ({
				...node,
				config: { ...node.config, outputFields: OUTPUT_FIELDS },
			})
			const getAddTrigger = () => screen.getByRole('combobox', { name: '도구 추가' })

			it('도구 없는 AI에 출력 칸이 있으면 도구 목록을 열지 않고 지우라고 안내한다', async () => {
				const user = userEvent.setup()
				const { onNodeChange } = renderPanel(withOutputFields(createAiNode('ai.reasoning')))

				expect(getAddTrigger()).toHaveAttribute('aria-disabled', 'true')
				expect(getAddTrigger()).toHaveAccessibleDescription('출력 칸을 모두 지우면 도구를 고를 수 있어요.')
				await user.click(getAddTrigger())
				expect(screen.queryByRole('listbox', { name: '도구 목록' })).not.toBeInTheDocument()
				expect(onNodeChange).not.toHaveBeenCalled()
			})

			it('출력 칸을 모두 지우면 다시 도구를 고를 수 있다', async () => {
				const user = userEvent.setup()
				const { lastNode } = renderPanel(withOutputFields(createAiNode('ai.reasoning')))

				await user.click(screen.getByRole('button', { name: '1번째 출력 칸 삭제' }))
				expect(getAddTrigger()).not.toHaveAttribute('aria-disabled')

				const listbox = await openAddList(user)
				await user.click(within(listbox).getByRole('option', { name: new RegExp(`^${DISCORD_TITLE}`) }))
				expect(lastNode().event).toBe('ai.agent')
			})

			it('도구를 쓰는 AI에 출력 칸이 남아 있으면 실행되지 않는다고 알리고 출력 칸만 지운다', async () => {
				const user = userEvent.setup()
				const tools = [{ name: SLACK_TOOL, config: {} }]
				const { lastNode } = renderPanel(withOutputFields(createAiNode('ai.agent', tools)))

				const alert = within(getToolsSection()).getByRole('alert')
				expect(alert).toHaveTextContent('도구를 쓰는 AI는 출력 칸을 쓸 수 없어 지금은 실행할 수 없어요.')
				expect(alert).toHaveTextContent('도구를 모두 빼 주세요.')
				expect(getAddTrigger()).toHaveAttribute('aria-disabled', 'true')

				await user.click(within(alert).getByRole('button', { name: '출력 칸 지우기' }))

				expect(lastNode().event).toBe('ai.agent')
				expect(lastNode().config).not.toHaveProperty('outputFields')
				expect(lastNode().config.tools).toEqual(tools)
				expect(within(getToolsSection()).queryByRole('alert')).not.toBeInTheDocument()
				expect(getAddTrigger()).not.toHaveAttribute('aria-disabled')
			})

			it('도구 없는 ai.agent에 출력 칸이 남아 있으면 출력 칸을 지우라고만 안내한다', () => {
				renderPanel(withOutputFields(createAiNode('ai.agent')))

				const alert = within(getToolsSection()).getByRole('alert')
				expect(alert).toHaveTextContent('출력 칸을 지워 주세요.')
				expect(alert).not.toHaveTextContent('도구를 모두 빼')
			})

			it('마지막 도구를 빼서 도구 없는 AI로 돌아가면 남겨 둔 출력 칸을 다시 편집한다', async () => {
				const user = userEvent.setup()
				const { lastNode } = renderPanel(withOutputFields(createAiNode('ai.agent', [{ name: SLACK_TOOL, config: {} }])))

				expect(screen.queryByRole('region', { name: '출력 칸' })).not.toBeInTheDocument()
				await user.click(screen.getByRole('button', { name: `${SLACK_TITLE} 도구 빼기` }))

				expect(lastNode().event).toBe('ai.reasoning')
				expect(lastNode().config.outputFields).toEqual(OUTPUT_FIELDS)
				expect(screen.getByRole('textbox', { name: '1번째 출력 칸 이름' })).toHaveValue('urgent')
				expect(within(getToolsSection()).queryByRole('alert')).not.toBeInTheDocument()
			})
		})
	})

	describe('AI 출력 칸', () => {
		const createReasoningNode = (config: Record<string, unknown> = {}) =>
			createNode({
				type: 'AI',
				event: 'ai.reasoning',
				label: '문의 분류',
				config: { agentType: 'simple', tools: [], llmProvider: 'CLAUDE', prompt: '분류해줘', ...config },
			})

		const getOutputSection = () => screen.getByRole('region', { name: '출력 칸' })
		const getAddButton = () => within(getOutputSection()).getByRole('button', { name: '출력 칸 추가' })
		const getKeyInput = (order: number) => screen.getByRole('textbox', { name: `${order}번째 출력 칸 이름` })

		it('ai.reasoning은 출력 칸을 읽기 전용 문구 대신 편집기로 보여 준다', () => {
			renderPanel(createReasoningNode())

			expect(getOutputSection()).toHaveTextContent('AI가 이 칸들로만 답해요.')
			expect(screen.queryByText(/화면에서 바꿀 수 없어요/)).not.toBeInTheDocument()
			expect(within(getOutputSection()).queryByRole('listitem')).not.toBeInTheDocument()
		})

		it('카탈로그에 출력 칸이 없는 ai.agent는 편집기를 보여 주지 않는다', () => {
			renderPanel(createNode({ type: 'AI', event: 'ai.agent', config: { agentType: 'react', tools: [] } }))

			expect(screen.getByRole('region', { name: '도구' })).toBeInTheDocument()
			expect(screen.queryByRole('region', { name: '출력 칸' })).not.toBeInTheDocument()
		})

		it('칸을 추가하면 text 타입 빈 이름 칸을 저장하고 이름을 채우라고 알린다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createReasoningNode())

			await user.click(getAddButton())

			expect(lastNode().config.outputFields).toEqual([{ key: '', type: 'text' }])
			expect(getKeyInput(1)).toHaveAttribute('aria-invalid', 'true')
			expect(getKeyInput(1)).toHaveAccessibleDescription('이름을 입력하세요.')
			expect(screen.getByText(/출력 칸 1곳을 고쳐야 실행할 수 있어요\./)).toHaveAttribute('role', 'status')
		})

		it('이름·타입·설명을 원소에 쓰고 비운 설명은 키를 뺀다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createReasoningNode({ outputFields: [{ key: '', type: 'text' }] }))

			await user.type(getKeyInput(1), 'urgent')
			await chooseFromDropdown(user, '1번째 출력 칸 타입', '참/거짓')
			await user.type(screen.getByRole('textbox', { name: '1번째 출력 칸 설명' }), '급한 문의인지')

			expect(lastNode().config.outputFields).toEqual([{ key: 'urgent', type: 'boolean', description: '급한 문의인지' }])
			expect(within(getOutputSection()).getByText('7/500')).toBeInTheDocument()
			expect(screen.queryByText(/곳을 고쳐야 실행할 수 있어요/)).not.toBeInTheDocument()

			await user.clear(screen.getByRole('textbox', { name: '1번째 출력 칸 설명' }))
			expect(lastNode().config.outputFields).toEqual([{ key: 'urgent', type: 'boolean' }])
		})

		it('규칙에 어긋난 이름도 그대로 저장하고 칸 아래와 패널 상단에 알리며 고치면 알림을 지운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(
				createReasoningNode({
					outputFields: [
						{ key: 'summary', type: 'text' },
						{ key: 'api_token', type: 'text' },
					],
				})
			)

			expect(getKeyInput(2)).toHaveAccessibleDescription(/민감정보/)
			expect(screen.getByText(/출력 칸 1곳을/)).toHaveAttribute('role', 'status')

			await user.clear(getKeyInput(2))
			await user.type(getKeyInput(2), 'summary')
			expect(lastNode().config.outputFields).toEqual([
				{ key: 'summary', type: 'text' },
				{ key: 'summary', type: 'text' },
			])
			expect(getKeyInput(2)).toHaveAccessibleDescription('같은 이름의 칸이 이미 있어요.')

			await user.type(getKeyInput(2), '_2')
			expect(getKeyInput(2)).not.toHaveAttribute('aria-invalid')
			expect(within(getOutputSection()).queryByRole('alert')).not.toBeInTheDocument()
			expect(screen.queryByText(/곳을 고쳐야 실행할 수 있어요/)).not.toBeInTheDocument()
		})

		it('타입이 비었거나 목록 밖이면 타입 드롭다운을 오류로 표시하고 고르면 지운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createReasoningNode({ outputFields: [{ key: 'score', type: 'string' }] }))
			const getTypeTrigger = () => screen.getByRole('combobox', { name: '1번째 출력 칸 타입' })

			expect(getTypeTrigger()).toHaveAttribute('aria-invalid', 'true')
			expect(getTypeTrigger()).toHaveAccessibleDescription('타입을 고르세요.')

			await chooseFromDropdown(user, '1번째 출력 칸 타입', '숫자')
			expect(lastNode().config.outputFields).toEqual([{ key: 'score', type: 'number' }])
			expect(getTypeTrigger()).not.toHaveAttribute('aria-invalid')
		})

		it('칸을 지우면 남은 칸을 그대로 두고 마지막 칸을 지우면 출력 칸 키를 지운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(
				createReasoningNode({
					outputFields: [
						{ key: 'first', type: 'text' },
						{ key: 'second', type: 'number' },
					],
				})
			)

			await user.click(screen.getByRole('button', { name: '1번째 출력 칸 삭제' }))
			expect(lastNode().config.outputFields).toEqual([{ key: 'second', type: 'number' }])
			expect(getKeyInput(1)).toHaveValue('second')

			await user.click(screen.getByRole('button', { name: '1번째 출력 칸 삭제' }))
			expect(lastNode().config).not.toHaveProperty('outputFields')
			expect(lastNode().config).toMatchObject({ prompt: '분류해줘', tools: [] })
		})

		it('20개가 되면 더 추가하지 않고 한도를 안내한다', async () => {
			const user = userEvent.setup()
			const outputFields = Array.from({ length: 20 }, (_, index) => ({ key: `field_${index}`, type: 'text' }))
			const { onNodeChange } = renderPanel(createReasoningNode({ outputFields }))

			expect(getAddButton()).toHaveAttribute('aria-disabled', 'true')
			expect(getAddButton()).toHaveAccessibleDescription('출력 칸은 20개까지 만들 수 있어요.')
			await user.click(getAddButton())
			expect(onNodeChange).not.toHaveBeenCalled()
		})

		it('밖에서 출력 칸 값이 바뀌면 행을 다시 그린다', () => {
			const node = createReasoningNode({ outputFields: [{ key: 'first', type: 'text' }] })
			const { rerender } = renderWithProviders(
				<NodeSettingsPanel {...nodeTestProps} node={node} onNodeChange={() => undefined} onClose={() => undefined} />
			)
			expect(getKeyInput(1)).toHaveValue('first')

			const changed = createReasoningNode({
				outputFields: [
					{ key: 'from_chat', type: 'text' },
					{ key: 'score', type: 'number' },
				],
			})
			rerender(
				<NodeSettingsPanel {...nodeTestProps} node={changed} onNodeChange={() => undefined} onClose={() => undefined} />
			)

			expect(getKeyInput(1)).toHaveValue('from_chat')
			expect(getKeyInput(2)).toHaveValue('score')
		})

		it('목록이 아닌 값은 행으로 고칠 수 없어 비우기만 제공한다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createReasoningNode({ outputFields: 'urgent' }))

			expect(within(getOutputSection()).getByRole('alert')).toHaveTextContent('출력 칸 값을 읽을 수 없어요.')
			expect(within(getOutputSection()).queryByRole('button', { name: '출력 칸 추가' })).not.toBeInTheDocument()

			await user.click(within(getOutputSection()).getByRole('button', { name: '출력 칸 비우기' }))
			expect(lastNode().config).not.toHaveProperty('outputFields')
		})
	})

	describe('목록 공급원 드롭다운', () => {
		const channels: NodeOption[] = [
			{ id: 'C1', name: '#general' },
			{ id: 'C2', name: '#random' },
		]

		// 연쇄 칸(ai.models)을 함께 확인하려고 항목을 따로 둔다.
		const aiEntry: NodeCatalogEntry = {
			...typedEntry,
			id: 'ai.agent',
			inputFields: [
				{
					key: 'llmProvider',
					title: 'AI 제공자',
					type: 'string',
					ref: false,
					choices: [
						{ id: 'CLAUDE', name: 'Claude' },
						{ id: 'GEMINI', name: 'Gemini' },
					],
					path: 'config.llmProvider',
				},
				{
					key: 'model',
					title: '모델',
					type: 'string',
					required: true,
					optionsSource: 'ai.models',
					optionsInputs: ['llmProvider'],
					path: 'config.model',
				},
				{
					key: 'credentialId',
					title: '크레덴셜',
					type: 'string',
					optionsSource: 'ieum.credentials',
					optionsInputs: ['llmProvider'],
					path: 'config.credentialId',
				},
			],
		}

		/** options 요청을 기록하고 `respond` 결과를 한 페이지로 돌려준다. */
		const mockOptions = (respond: (url: URL) => { items: NodeOption[]; nextCursor?: string | null } | Response) => {
			const requests: URL[] = []
			server.use(
				http.get('*/api/v1/integrations/:app/options/:resource', ({ request }) => {
					const url = new URL(request.url)
					requests.push(url)
					const result = respond(url)
					return result instanceof Response
						? result
						: HttpResponse.json({ success: true, message: 'OK', code: 'OK', data: result })
				})
			)
			return requests
		}

		const optionsError = (status: number, code: string) =>
			HttpResponse.json({ success: false, data: null, message: '서버 메시지', code }, { status })

		beforeEach(() => {
			mocks.entries = [...nodeCatalogEntriesFixture.filter(entry => entry.id !== 'ai.agent'), aiEntry]
		})

		it('목록에서 고르면 id를 저장하고 _names에 이름을 남기며 칸에 이름과 ID를 보여 준다', async () => {
			const user = userEvent.setup()
			const requests = mockOptions(() => ({ items: channels, nextCursor: null }))
			const { lastNode } = renderPanel(createNode())

			await user.click(getFieldInput('채널'))
			await user.click(await screen.findByRole('option', { name: /#random/ }))

			expect(requests[0].pathname).toMatch(/\/api\/v1\/integrations\/slack\/options\/channels$/)
			expect(lastNode().config).toEqual({ brand: 'slack', channel: 'C2', _names: { channel: '#random' } })
			expect(getFieldInput('채널')).toHaveTextContent('#random')
			expect(screen.getByText('ID: C2')).toBeInTheDocument()
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
		})

		it('글자 입력을 받지 않아 목록에서만 고를 수 있고 검색어 q를 보내지 않는다', async () => {
			const user = userEvent.setup()
			const requests = mockOptions(() => ({ items: channels }))
			const { onNodeChange } = renderPanel(
				createNode({ config: { brand: 'slack', channel: 'C1', _names: { channel: '#general' } } })
			)

			expect(screen.queryByRole('textbox', { name: /^채널/ })).not.toBeInTheDocument()
			await user.click(getFieldInput('채널'))
			await screen.findByRole('option', { name: /#general/ })
			await user.keyboard('ran')
			await user.tab()

			expect(onNodeChange).not.toHaveBeenCalled()
			expect(getFieldInput('채널')).toHaveTextContent('#general')
			expect(requests.every(url => !url.searchParams.has('q'))).toBe(true)
		})

		it('맨 위 선택 안 함을 고르면 값과 표시 이름을 지운다', async () => {
			const user = userEvent.setup()
			mockOptions(() => ({ items: channels }))
			const { lastNode } = renderPanel(
				createNode({ config: { brand: 'slack', channel: 'C1', _names: { channel: '#general' } } })
			)

			await user.click(getFieldInput('채널'))
			const options = within(await screen.findByRole('listbox', { name: '채널 목록' })).getAllByRole('option')
			expect(options[0]).toHaveTextContent('선택 안 함')
			await user.click(options[0])

			expect(lastNode().config).toEqual({ brand: 'slack' })
			expect(getFieldInput('채널')).toHaveTextContent('목록에서 골라 주세요')
		})

		it('표시 이름이 빈 문자열이면 ID를, 목록에 없는 참조식 값은 그대로 보여 준다', () => {
			const { unmount } = renderWithProviders(
				<NodeSettingsPanel
					{...nodeTestProps}
					node={createNode({ config: { brand: 'slack', channel: 'C1', _names: { channel: '' } } })}
					onNodeChange={vi.fn()}
					onClose={vi.fn()}
				/>
			)
			expect(getFieldInput('채널')).toHaveTextContent('C1')
			unmount()

			renderPanel(createNode({ config: { brand: 'slack', channel: '{{nodes.a.output.channel}}' } }))
			expect(getFieldInput('채널')).toHaveTextContent('{{nodes.a.output.channel}}')
		})

		it('더 불러오기로 nextCursor 다음 페이지를 이어 붙이고 마지막 페이지면 버튼을 숨긴다', async () => {
			const user = userEvent.setup()
			const requests = mockOptions(url =>
				url.searchParams.get('cursor') === 'page-2'
					? { items: [{ id: 'C3', name: '#notice' }], nextCursor: null }
					: { items: channels, nextCursor: 'page-2' }
			)
			renderPanel(createNode())

			await user.click(getFieldInput('채널'))
			const moreButton = await screen.findByRole('button', { name: '더 불러오기' })
			// Safari는 클릭한 버튼에 포커스를 주지 않아, mousedown을 막지 않으면 blur로 목록이 먼저 닫힌다.
			expect(fireEvent.mouseDown(moreButton)).toBe(false)
			await user.click(moreButton)

			expect(await screen.findByRole('option', { name: /#notice/ })).toBeInTheDocument()
			// 맨 위 선택 안 함 행을 포함한다.
			expect(screen.getAllByRole('option')).toHaveLength(4)
			expect(requests.at(-1)?.searchParams.get('cursor')).toBe('page-2')
			expect(screen.queryByRole('button', { name: '더 불러오기' })).not.toBeInTheDocument()
		})

		it('연쇄 칸은 부모 칸이 비면 칸을 끄고, 채우면 부모 값을 쿼리로 보내며 기본 모델을 비우기 행으로 안내한다', async () => {
			const user = userEvent.setup()
			const requests = mockOptions(() => ({ items: [{ id: 'gemini-pro', name: 'Gemini Pro' }] }))
			const geminiDefault = {
				...providersResponse.data.providers[0],
				models: [{ ...providersResponse.data.providers[0].models[0], default: true }],
			}
			server.use(
				http.get('*/api/v1/providers', () =>
					HttpResponse.json({ ...providersResponse, data: { providers: [geminiDefault] } })
				)
			)
			const { lastNode } = renderPanel(createNode({ type: 'AI', event: 'ai.agent', config: {} }))

			expect(getFieldInput('모델')).toHaveAccessibleDescription("'AI 제공자' 칸을 먼저 채우면 목록에서 고를 수 있어요.")
			expect(getFieldInput('모델')).toHaveAttribute('aria-disabled', 'true')
			expect(requests).toHaveLength(0)

			await chooseFromDropdown(user, 'AI 제공자', 'Gemini')
			await waitFor(() => expect(getFieldInput('모델')).toHaveTextContent('비우면 기본 모델(Gemini 2.5 Flash)로 실행해요'))
			await user.click(getFieldInput('모델'))
			const listbox = await screen.findByRole('listbox', { name: '모델 목록' })
			expect(within(listbox).getAllByRole('option')[0]).toHaveTextContent('기본 모델(Gemini 2.5 Flash)')
			await user.click(await screen.findByRole('option', { name: /Gemini Pro/ }))

			expect(requests[0].searchParams.get('llmProvider')).toBe('GEMINI')
			expect(lastNode().config).toEqual({
				llmProvider: 'GEMINI',
				model: 'gemini-pro',
				_names: { model: 'Gemini Pro' },
			})
		})

		it('내부 UUID가 값인 크레덴셜 칸은 목록 행과 칸 아래에 ID를 보여 주지 않는다', async () => {
			const user = userEvent.setup()
			const credentialId = '550e8400-e29b-41d4-a716-446655440000'
			mockOptions(() => ({ items: [{ id: credentialId, name: 'Gemini API Key' }] }))
			const { lastNode } = renderPanel(createNode({ type: 'AI', event: 'ai.agent', config: { llmProvider: 'GEMINI' } }))

			await user.click(getFieldInput('크레덴셜'))
			const option = await screen.findByRole('option', { name: 'Gemini API Key' })
			expect(option).not.toHaveTextContent(credentialId)
			await user.click(option)

			expect(lastNode().config).toEqual({ llmProvider: 'GEMINI', credentialId, _names: { credentialId: 'Gemini API Key' } })
			expect(getFieldInput('크레덴셜')).toHaveTextContent('Gemini API Key')
			expect(screen.queryByText(credentialId, { exact: false })).not.toBeInTheDocument()
		})

		it('카탈로그가 required로 내려도 model 칸은 비우면 기본 모델로 실행되어 필수 경고를 하지 않는다', () => {
			renderPanel(createNode({ type: 'AI', event: 'ai.agent', config: { llmProvider: 'GEMINI' } }))

			expect(getFieldInput('모델')).not.toHaveAccessibleDescription(/필수 칸이 비어 있어요/)
			expect(screen.queryByText(/필수 칸 \d+개가 비어 있어요/)).not.toBeInTheDocument()
		})

		it('부모 칸이 참조식이면 칸을 끄고 이유와 기본 모델 실행을 안내한다', () => {
			renderPanel(createNode({ type: 'AI', event: 'ai.agent', config: { llmProvider: '{{nodes.a.output.provider}}' } }))

			expect(getFieldInput('모델')).toHaveAccessibleDescription("'AI 제공자' 칸이 참조식이라 목록에서 고를 수 없어요.")
			expect(getFieldInput('모델')).toHaveAttribute('aria-disabled', 'true')
			expect(getFieldInput('모델')).toHaveTextContent('비우면 기본 모델로 실행해요')
		})

		it('부모 칸이 막혀 있어도 패널 밖에서 들어온 값은 목록 조회 없이 비우기 행으로 지울 수 있다', async () => {
			const user = userEvent.setup()
			const requests = mockOptions(() => ({ items: [{ id: 'gemini-pro', name: 'Gemini Pro' }] }))
			const { lastNode } = renderPanel(
				createNode({
					type: 'AI',
					event: 'ai.agent',
					config: { llmProvider: '{{nodes.a.output.provider}}', model: 'gpt-4o' },
				})
			)

			expect(getFieldInput('모델')).not.toHaveAttribute('aria-disabled')
			await user.click(getFieldInput('모델'))
			const options = within(screen.getByRole('listbox', { name: '모델 목록' })).getAllByRole('option')
			expect(options.map(option => option.textContent)).toEqual(['기본 모델'])
			expect(screen.queryByText('고를 수 있는 항목이 없어요.')).not.toBeInTheDocument()
			await user.click(options[0])

			expect(requests).toHaveLength(0)
			expect(lastNode().config).toEqual({ llmProvider: '{{nodes.a.output.provider}}' })
			expect(getFieldInput('모델')).toHaveAttribute('aria-disabled', 'true')
			// disabled로 막으면 비운 순간 포커스가 body로 빠진다.
			expect(getFieldInput('모델')).toHaveFocus()
			await user.keyboard('{Enter}')
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
		})

		it('부모 칸을 바꾸면 연쇄로 지운 자식 칸 표시도 비운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(
				createNode({
					type: 'AI',
					event: 'ai.agent',
					config: { llmProvider: 'GEMINI', model: 'gemini-pro', _names: { model: 'Gemini Pro' } },
				})
			)
			expect(getFieldInput('모델')).toHaveTextContent('Gemini Pro')

			await chooseFromDropdown(user, 'AI 제공자', 'Claude')

			expect(lastNode().config).toEqual({ llmProvider: 'CLAUDE' })
			expect(getFieldInput('모델')).toHaveTextContent('비우면 기본 모델로 실행해요')
			expect(screen.queryByText('ID: gemini-pro')).not.toBeInTheDocument()
		})

		it('연동이 필요한 오류는 비우기 행을 남긴 채 안내와 통합 설정 링크를 보여 준다', async () => {
			const user = userEvent.setup()
			mockOptions(() => optionsError(400, 'SLACK_NOT_CONNECTED'))
			renderPanel(createNode())

			await user.click(getFieldInput('채널'))

			const alert = await screen.findByRole('alert')
			expect(alert).toHaveTextContent('Slack 봇이 연결되지 않았어요.')
			const link = within(alert).getByRole('link', { name: '통합 설정 열기' })
			expect(link).toHaveAttribute('href', '/inter-setting')
			expect(fireEvent.mouseDown(link)).toBe(false)
			const listbox = screen.getByRole('listbox', { name: '채널 목록' })
			expect(within(listbox).getByRole('option', { name: '선택 안 함' })).toBeInTheDocument()
		})

		it('재시도해도 같은 오류는 자동 재시도 없이 바로 안내하고 다시 시도로 목록을 다시 부른다', async () => {
			const user = userEvent.setup()
			let failed = false
			const requests = mockOptions(() => {
				if (failed) return { items: channels }
				failed = true
				return HttpResponse.json(
					{ success: false, data: null, message: '채널 ID 형식이 올바르지 않습니다', code: 'INVALID_INPUT' },
					{ status: 400 }
				)
			})
			renderPanel(createNode())

			await user.click(getFieldInput('채널'))
			expect(await screen.findByRole('alert')).toHaveTextContent('채널 ID 형식이 올바르지 않습니다')
			expect(requests).toHaveLength(1)
			// Tab으로 옮겨 간 버튼은 목록을 받으면 사라지므로, 누른 뒤 포커스가 칸으로 돌아와야 목록이 열린 채 남지 않는다.
			await user.tab()
			expect(screen.getByRole('button', { name: '다시 시도' })).toHaveFocus()
			await user.keyboard('{Enter}')

			expect(await screen.findByRole('option', { name: /#general/ })).toBeInTheDocument()
			expect(getFieldInput('채널')).toHaveFocus()
		})

		it('footer 버튼에 포커스가 있을 때 Escape는 패널 대신 목록을 닫고 칸으로 포커스를 돌린다', async () => {
			const user = userEvent.setup()
			mockOptions(() => optionsError(400, 'INVALID_INPUT'))
			const onClose = vi.fn()
			renderWithProviders(
				<NodeSettingsPanel {...nodeTestProps} node={createNode()} onNodeChange={vi.fn()} onClose={onClose} />
			)

			await user.click(getFieldInput('채널'))
			await screen.findByRole('alert')
			await user.tab()
			expect(screen.getByRole('button', { name: '다시 시도' })).toHaveFocus()
			await user.keyboard('{Escape}')

			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
			expect(onClose).not.toHaveBeenCalled()
			expect(getFieldInput('채널')).toHaveFocus()
		})

		it('키보드로 목록을 열고 고르며 목록이 열린 동안 Escape는 패널 대신 목록을 닫는다', async () => {
			const user = userEvent.setup()
			mockOptions(() => ({ items: channels }))
			const onClose = vi.fn()
			const onNodeChange = vi.fn()
			renderWithProviders(
				<NodeSettingsPanel {...nodeTestProps} node={createNode()} onNodeChange={onNodeChange} onClose={onClose} />
			)
			const trigger = getFieldInput('채널')
			trigger.focus()

			await user.keyboard('{ArrowDown}')
			await screen.findByRole('option', { name: /#general/ })
			// 선택 안 함 → #general → #random
			await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
			expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /#random/ }).id)
			await user.keyboard('{Escape}')

			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
			expect(onClose).not.toHaveBeenCalled()

			await user.keyboard('{Enter}')
			await screen.findByRole('option', { name: /#general/ })
			await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
			expect(onNodeChange.mock.lastCall?.[0].config).toEqual({
				brand: 'slack',
				channel: 'C1',
				_names: { channel: '#general' },
			})
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
		})

		it('Space로 열고 고르며 ArrowUp은 마지막 행부터 강조하고, Space keyup의 기본 click을 막는다', async () => {
			const user = userEvent.setup()
			mockOptions(() => ({ items: channels }))
			const { lastNode } = renderPanel(createNode())
			const trigger = getFieldInput('채널')
			trigger.focus()

			await user.keyboard(' ')
			await screen.findByRole('option', { name: /#random/ })
			// Firefox는 keydown을 막아도 keyup에서 click을 일으켜 연 목록이 바로 닫힌다.
			expect(fireEvent.keyUp(trigger, { key: ' ' })).toBe(false)
			await user.keyboard('{ArrowUp}')
			expect(trigger).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /#random/ }).id)
			await user.keyboard(' ')

			expect(lastNode().config).toEqual({ brand: 'slack', channel: 'C2', _names: { channel: '#random' } })
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
		})

		it('열 때 팝업을, 키보드로 옮길 때만 강조 행을 스크롤 영역 안으로 옮긴다', async () => {
			const user = userEvent.setup()
			// jsdom에는 scrollIntoView가 없어 호출만 기록한다.
			const scrollIntoView = vi.fn()
			Element.prototype.scrollIntoView = scrollIntoView
			mockOptions(() => ({ items: channels }))
			renderPanel(createNode())

			try {
				getFieldInput('채널').focus()
				await user.keyboard('{ArrowDown}')
				await screen.findByRole('option', { name: /#general/ })
				// 패널 아래쪽 칸에서도 열린 목록이 보이도록 팝업을 먼저 스크롤한다.
				expect(scrollIntoView.mock.contexts[0]).toContainElement(screen.getByRole('listbox'))
				await user.keyboard('{ArrowDown}{ArrowDown}')

				expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
				expect(scrollIntoView.mock.contexts.at(-1)).toBe(screen.getByRole('option', { name: /#general/ }))

				// 마우스로 바꾼 강조에서 스크롤하면 목록이 커서 아래에서 밀린다.
				const callCount = scrollIntoView.mock.calls.length
				await user.hover(screen.getByRole('option', { name: /#random/ }))
				expect(scrollIntoView).toHaveBeenCalledTimes(callCount)
			} finally {
				delete (Element.prototype as Partial<Element>).scrollIntoView
			}
		})

		it('마우스를 올린 행을 강조 행으로 맞춰 Enter로 그 행을 고른다', async () => {
			const user = userEvent.setup()
			mockOptions(() => ({ items: channels }))
			const { lastNode } = renderPanel(createNode())
			const trigger = getFieldInput('채널')

			await user.click(trigger)
			await user.keyboard('{ArrowDown}')
			const random = await screen.findByRole('option', { name: /#random/ })
			await user.hover(random)
			expect(trigger).toHaveAttribute('aria-activedescendant', random.id)
			await user.keyboard('{Enter}')

			expect(lastNode().config).toEqual({ brand: 'slack', channel: 'C2', _names: { channel: '#random' } })
		})
	})

	describe('목록 칸 드롭다운', () => {
		const LABELS_TITLE = '보낸 뒤 붙일 라벨'
		const labels: NodeOption[] = [
			{ id: 'IMPORTANT', name: '중요' },
			{ id: 'Label_12', name: '고객' },
		]

		// 실제 카탈로그에서 목록이면서 options가 있는 칸은 gmail.send_email의 label_ids뿐이라 그 모양을 그대로 둔다.
		const gmailEntry: NodeCatalogEntry = {
			...typedEntry,
			id: 'gmail.send_email',
			fixed: { type: 'ACTION', event: 'gmail.send_email', config: {} },
			inputFields: [
				{ key: 'subject', title: '제목', type: 'string', required: true, path: 'config.subject' },
				{
					key: 'label_ids',
					title: LABELS_TITLE,
					type: 'string',
					list: true,
					ref: false,
					optionsSource: 'google.gmail_labels',
					path: 'config.label_ids',
				},
			],
		}

		const createGmailNode = (config: Record<string, unknown> = {}) =>
			createNode({ event: 'gmail.send_email', config: { subject: '안녕', ...config } })

		/** options 요청을 기록하고 `respond` 결과를 한 페이지로 돌려준다. */
		const mockLabels = (respond: (url: URL) => { items: NodeOption[]; nextCursor?: string | null } | Response) => {
			const requests: URL[] = []
			server.use(
				http.get('*/api/v1/integrations/:app/options/:resource', ({ request }) => {
					const url = new URL(request.url)
					requests.push(url)
					const result = respond(url)
					return result instanceof Response
						? result
						: HttpResponse.json({ success: true, message: 'OK', code: 'OK', data: result })
				})
			)
			return requests
		}

		const getChips = () => within(screen.getByRole('list', { name: `고른 ${LABELS_TITLE}` })).getAllByRole('listitem')

		beforeEach(() => {
			mocks.entries = [...nodeCatalogEntriesFixture, gmailEntry]
		})

		it('목록에서 하나씩 고르면 id를 이어 붙이고 _names에 id별 이름을 저장하며 칩으로 보여 준다', async () => {
			const user = userEvent.setup()
			const requests = mockLabels(() => ({ items: labels, nextCursor: null }))
			const { lastNode } = renderPanel(createGmailNode())

			expect(screen.queryByRole('textbox', { name: new RegExp(`^${LABELS_TITLE}`) })).not.toBeInTheDocument()
			await chooseFromDropdown(user, LABELS_TITLE, /^중요/)
			expect(lastNode().config).toEqual({
				subject: '안녕',
				label_ids: ['IMPORTANT'],
				_names: { label_ids: { IMPORTANT: '중요' } },
			})
			await chooseFromDropdown(user, LABELS_TITLE, /^고객/)

			expect(lastNode().config).toEqual({
				subject: '안녕',
				label_ids: ['IMPORTANT', 'Label_12'],
				_names: { label_ids: { IMPORTANT: '중요', Label_12: '고객' } },
			})
			expect(getChips().map(chip => chip.textContent)).toEqual(['중요IMPORTANT', '고객Label_12'])
			expect(requests[0].pathname).toMatch(/\/api\/v1\/integrations\/google\/options\/gmail_labels$/)
			expect(requests.every(url => !url.searchParams.has('q'))).toBe(true)
		})

		it('이미 고른 항목은 고르면 빠진다고 보조기술에 알리고, 다시 고르면 뺀다', async () => {
			const user = userEvent.setup()
			mockLabels(() => ({ items: labels }))
			const { lastNode } = renderPanel(
				createGmailNode({
					label_ids: ['IMPORTANT', 'Label_12'],
					_names: { label_ids: { IMPORTANT: '중요', Label_12: '고객' } },
				})
			)

			await chooseFromDropdown(user, LABELS_TITLE, '중요 IMPORTANT, 선택됨, 고르면 빼요')

			expect(lastNode().config).toEqual({
				subject: '안녕',
				label_ids: ['Label_12'],
				_names: { label_ids: { Label_12: '고객' } },
			})
		})

		it('칩의 빼기 버튼으로 빼면 이름도 지우고, 마지막 항목을 빼면 값과 _names를 모두 지운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(
				createGmailNode({
					label_ids: ['IMPORTANT', 'Label_12'],
					_names: { label_ids: { IMPORTANT: '중요', Label_12: '고객' }, other: '유지' },
				})
			)

			await user.click(screen.getByRole('button', { name: '중요 빼기' }))
			expect(lastNode().config).toEqual({
				subject: '안녕',
				label_ids: ['Label_12'],
				_names: { label_ids: { Label_12: '고객' }, other: '유지' },
			})
			// 누른 버튼이 칩과 함께 사라져도 포커스가 추가 드롭다운에 남는다.
			expect(getFieldInput(LABELS_TITLE)).toHaveFocus()

			await user.click(screen.getByRole('button', { name: '고객 빼기' }))

			expect(lastNode().config).toEqual({ subject: '안녕', _names: { other: '유지' } })
			expect(screen.queryByRole('list', { name: `고른 ${LABELS_TITLE}` })).not.toBeInTheDocument()
		})

		it('고르지 않은 항목은 선택됨을 알리지 않는다', async () => {
			const user = userEvent.setup()
			mockLabels(() => ({ items: labels }))
			renderPanel(createGmailNode({ label_ids: ['IMPORTANT'], _names: { label_ids: { IMPORTANT: '중요' } } }))

			await user.click(getFieldInput(LABELS_TITLE))
			const listbox = await screen.findByRole('listbox', { name: `${LABELS_TITLE} 목록` })

			expect(
				within(listbox)
					.getAllByRole('option')
					.map(option => option.getAttribute('aria-label'))
			).toEqual(['중요 IMPORTANT, 선택됨, 고르면 빼요', null])
		})

		it('참조식을 허용하는 목록 칸은 칩 목록 대신 한 줄에 하나씩 입력한다', () => {
			mocks.entries = [{ ...gmailEntry, inputFields: [{ ...gmailEntry.inputFields[1], ref: undefined }] }]
			renderPanel(createGmailNode())

			expect(getFieldInput(LABELS_TITLE).tagName).toBe('TEXTAREA')
			expect(screen.queryByRole('list', { name: `고른 ${LABELS_TITLE}` })).not.toBeInTheDocument()
		})

		it('목록에 없는 기존 값은 ID 칩으로 보여 주고 뺄 수 있다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createGmailNode({ label_ids: ['Label_99'] }))

			expect(getChips().map(chip => chip.textContent)).toEqual(['Label_99'])
			await user.click(screen.getByRole('button', { name: 'Label_99 빼기' }))

			expect(lastNode().config).toEqual({ subject: '안녕' })
		})

		it('Google 권한이 부족하면 통합 설정으로 안내한다', async () => {
			const user = userEvent.setup()
			mockLabels(() =>
				HttpResponse.json(
					{ success: false, data: null, message: '서버 메시지', code: 'GOOGLE_SCOPE_REQUIRED' },
					{ status: 403 }
				)
			)
			renderPanel(createGmailNode())

			await user.click(getFieldInput(LABELS_TITLE))
			const alert = await screen.findByRole('alert')

			expect(alert).toHaveTextContent('Google 권한이 더 필요해요')
			expect(within(alert).getByRole('link', { name: '통합 설정 열기' })).toHaveAttribute('href', '/inter-setting')
		})

		it('다음 페이지가 있으면 더 불러오기로 이어 받은 항목도 고를 수 있다', async () => {
			const user = userEvent.setup()
			const requests = mockLabels(url =>
				url.searchParams.get('cursor') === 'next'
					? { items: [labels[1]], nextCursor: null }
					: { items: [labels[0]], nextCursor: 'next' }
			)
			const { lastNode } = renderPanel(createGmailNode())

			await user.click(getFieldInput(LABELS_TITLE))
			await user.click(await screen.findByRole('button', { name: '더 불러오기' }))
			await user.click(await screen.findByRole('option', { name: /^고객/ }))

			expect(requests.map(url => url.searchParams.get('cursor'))).toEqual([null, 'next'])
			expect(lastNode().config).toMatchObject({ label_ids: ['Label_12'], _names: { label_ids: { Label_12: '고객' } } })
		})

		it('부모 칸이 비었으면 목록을 열지 않고 이유를 알리며, 고른 칩은 뺄 수 있다', async () => {
			const user = userEvent.setup()
			const requests = mockLabels(() => ({ items: labels }))
			// 실제 카탈로그의 목록 칸에는 부모 칸이 없어, 연쇄 칸 규칙을 확인하려고 optionsInputs를 붙인다.
			mocks.entries = [
				{
					...gmailEntry,
					inputFields: [
						{ key: 'account', title: '계정', type: 'string', path: 'config.account' },
						{ ...gmailEntry.inputFields[1], optionsInputs: ['account'] },
					],
				},
			]
			const { lastNode } = renderPanel(createGmailNode({ label_ids: ['IMPORTANT'] }))

			await user.click(getFieldInput(LABELS_TITLE))

			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
			expect(getFieldInput(LABELS_TITLE)).toHaveAttribute('aria-disabled', 'true')
			expect(getFieldInput(LABELS_TITLE)).toHaveAccessibleDescription(/'계정' 칸을 먼저 채우면/)
			await user.click(screen.getByRole('button', { name: 'IMPORTANT 빼기' }))
			expect(lastNode().config).toEqual({ subject: '안녕' })
			expect(requests).toHaveLength(0)
		})
	})

	it('패널 밖에서 노드 값이 바뀌면 다시 마운트하지 않고 칸 입력을 새 값으로 맞춘다', () => {
		const panelProps = { onNodeChange: vi.fn(), onClose: vi.fn() }
		const { rerender } = renderWithProviders(
			<NodeSettingsPanel
				{...nodeTestProps}
				node={createNode({ event: 'test.typed', config: { count: 1, headers: { A: '1' } } })}
				{...panelProps}
			/>
		)
		const panel = screen.getByRole('complementary', { name: '노드 설정' })

		rerender(
			<NodeSettingsPanel
				{...nodeTestProps}
				node={createNode({ event: 'test.typed', config: { count: '{{nodes.a.output.n}}', headers: { B: '2' } } })}
				{...panelProps}
			/>
		)

		expect(screen.getByRole('complementary', { name: '노드 설정' })).toBe(panel)
		expect(getFieldInput('개수')).toHaveValue('{{nodes.a.output.n}}')
		const modes = screen.getByRole('radiogroup', { name: '개수 입력 방식' })
		expect(within(modes).getByRole('radio', { name: '참조식' })).toHaveAttribute('aria-checked', 'true')
		expect(screen.getByLabelText('헤더 1번째 키')).toHaveValue('B')
		expect(screen.getByLabelText('헤더 1번째 값')).toHaveValue('2')
		expect(panelProps.onNodeChange).not.toHaveBeenCalled()
	})

	it('참조식이 섞인 json 값은 값 방식으로 열어 JSON 본문을 그대로 편집한다', () => {
		const payload = '{"text":"{{nodes.a.output.x}}"}'
		renderPanel(createNode({ event: 'test.typed', config: { payload } }))

		const modes = screen.getByRole('radiogroup', { name: '본문 JSON 입력 방식' })
		expect(within(modes).getByRole('radio', { name: '값' })).toHaveAttribute('aria-checked', 'true')
		expect(getFieldInput('본문 JSON')).toHaveValue(payload)
	})

	it('패널 안 키 입력이 React Flow 삭제 키로 처리되지 않게 nokey를 붙인다', () => {
		renderPanel(createNode())

		// React Flow는 .nokey 안에서 일어난 키 입력을 노드·연결선 삭제 단축키로 쓰지 않는다.
		expect(screen.getByRole('complementary', { name: '노드 설정' })).toHaveClass('nokey')
	})

	it('카탈로그 밖 노드는 설정을 바꿀 수 없다고 알리고 event를 보여 준다', () => {
		renderPanel(createNode({ event: 'future_app.do_something' }))

		expect(screen.getByText(/지원하지 않는 작업이라 화면에서 설정을 바꿀 수 없어요/)).toBeInTheDocument()
		expect(screen.getByText('future_app.do_something')).toBeInTheDocument()
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
	})

	it('카탈로그를 받는 중에는 skeleton을, 실패하면 다시 시도를 보여 준다', async () => {
		const user = userEvent.setup()
		mocks.entries = undefined
		const { unmount } = renderWithProviders(
			<NodeSettingsPanel {...nodeTestProps} node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />
		)
		expect(screen.getByRole('status', { name: '설정 칸 불러오는 중' })).toHaveAttribute('aria-busy', 'true')
		unmount()

		mocks.isError = true
		renderWithProviders(<NodeSettingsPanel {...nodeTestProps} node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />)
		await user.click(screen.getByRole('button', { name: '다시 시도' }))
		expect(mocks.refetch).toHaveBeenCalled()
	})

	it('받은 카탈로그가 있으면 재조회가 실패해도 오류 화면 대신 칸을 계속 보여 준다', () => {
		mocks.isError = true
		renderPanel(createNode())

		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(getFieldInput('메시지')).toBeInTheDocument()
	})

	it('닫기 버튼과 Escape로 닫는다', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()
		renderWithProviders(<NodeSettingsPanel {...nodeTestProps} node={createNode()} onNodeChange={vi.fn()} onClose={onClose} />)

		await user.click(screen.getByRole('button', { name: '노드 설정 닫기' }))
		await user.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledTimes(2)
	})

	describe('출력 참조 경고', () => {
		const aiNode: WorkflowNodeDto = {
			id: 'ai',
			type: 'AI',
			event: 'ai.reasoning',
			label: 'AI 요약',
			config: { outputFields: [{ key: 'summary', type: 'text' }] },
		}
		const laterNode = createNode({ id: 'later', event: 'gmail.new_email', label: '뒤 노드', config: {} })
		const edges = [
			{ source: 'ai', target: 'node-1' },
			{ source: 'node-1', target: 'later' },
		]

		it('없는 출력과 앞에 연결되지 않은 노드를 가리키면 칸과 패널에 경고하지만 입력은 그대로 저장한다', async () => {
			const user = userEvent.setup()
			const onNodeChange = vi.fn()
			const node = createNode({
				config: { brand: 'slack', text: '{{nodes.ai.output.title}} {{nodes.later.output.subject}}' },
			})
			renderWithProviders(
				<NodeSettingsPanel
					{...nodeTestProps}
					node={node}
					nodes={[aiNode, node, laterNode]}
					edges={edges}
					onNodeChange={onNodeChange}
					onClose={() => undefined}
				/>
			)

			expect(
				screen.getByText('참조 2곳을 확인해 주세요. 없거나 앞에 연결되지 않은 노드·출력을 가리키고 있어요. 저장은 돼요.')
			).toHaveAttribute('role', 'status')
			expect(getFieldInput('메시지')).toHaveAccessibleDescription(
				"'AI 요약' 노드에 없는 출력(title)을 가리켜요. 외 1곳 참조를 확인해 주세요."
			)

			await user.type(getFieldInput('메시지'), '!')
			expect(onNodeChange).toHaveBeenCalled()
		})

		it('알려진 출력을 가리키면 경고하지 않는다', () => {
			const node = createNode({ config: { brand: 'slack', text: '{{nodes.ai.output.summary}}' } })
			renderWithProviders(
				<NodeSettingsPanel
					{...nodeTestProps}
					node={node}
					nodes={[aiNode, node]}
					edges={edges}
					onNodeChange={vi.fn()}
					onClose={() => undefined}
				/>
			)

			expect(screen.queryByText(/참조를 확인해 주세요/)).not.toBeInTheDocument()
		})

		it('출력 칸 이름을 바꾸면 그 출력을 참조하던 아래 노드를 알리고 열 수 있게 한다', async () => {
			const user = userEvent.setup()
			const onNodeOpen = vi.fn()
			const referrer = createNode({ config: { brand: 'slack', text: '{{nodes.ai.output.summary}}' } })
			const Wrapper = () => {
				const [node, setNode] = useState(aiNode)
				return (
					<NodeSettingsPanel
						{...nodeTestProps}
						node={node}
						nodes={[node, referrer]}
						edges={edges}
						onNodeChange={setNode}
						onNodeOpen={onNodeOpen}
						onClose={() => undefined}
					/>
				)
			}
			renderWithProviders(<Wrapper />)
			expect(screen.queryByText(/없는 출력을 참조하는 노드가 있어요/)).not.toBeInTheDocument()

			const keyInput = screen.getByDisplayValue('summary')
			await user.clear(keyInput)
			await user.type(keyInput, 'brief')

			expect(screen.getByText(/이 노드에 없는 출력을 참조하는 노드가 있어요/)).toBeInTheDocument()
			await user.click(screen.getByRole('button', { name: "'요약 보내기' 열기" }))
			expect(onNodeOpen).toHaveBeenCalledWith('node-1')
		})
	})

	describe('Google Calendar 노드', () => {
		const createCalendarNode = (event: string, config: Record<string, unknown> = {}) =>
			createNode({ id: 'calendar', event, label: '일정 수정', config })

		/** options 요청을 기록하고 공급원별 응답을 돌려준다. 정하지 않은 공급원은 빈 목록이다. */
		const mockCalendarOptions = (
			pages: Record<string, (url: URL) => { items: NodeOption[]; nextCursor?: string | null }>
		) => {
			const requests: URL[] = []
			server.use(
				http.get('*/api/v1/integrations/:app/options/:resource', ({ request, params }) => {
					const url = new URL(request.url)
					requests.push(url)
					const respond = pages[`${String(params.app)}.${String(params.resource)}`]
					return HttpResponse.json({
						success: true,
						message: 'OK',
						code: 'OK',
						data: respond ? respond(url) : { items: [] },
					})
				})
			)
			return requests
		}

		it('시간대를 목록에서 고르고 비우면 키를 지운다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(createCalendarNode('google_calendar.update'))

			await chooseFromDropdown(user, '시간대', /^Asia\/Seoul/)
			expect(lastNode().config).toEqual({ time_zone: 'Asia/Seoul' })

			await chooseFromDropdown(user, '시간대', '선택 안 함')
			expect(lastNode().config).toEqual({})
		})

		it('목록에 없는 시간대 값도 그대로 보여 준다', () => {
			renderPanel(createCalendarNode('google_calendar.update', { time_zone: 'Mars/Olympus' }))

			expect(getFieldInput('시간대')).toHaveTextContent('Mars/Olympus')
		})

		it('캘린더를 비워 두면 기본 캘린더(primary)의 일정 목록을 불러온다', async () => {
			const user = userEvent.setup()
			const requests = mockCalendarOptions({
				'google.events': () => ({ items: [{ id: 'evt-1', name: '주간 회의' }] }),
			})
			const { lastNode } = renderPanel(createCalendarNode('google_calendar.update'))

			await chooseFromDropdown(user, '일정', /주간 회의/)

			expect(requests[0].pathname).toMatch(/\/integrations\/google\/options\/events$/)
			expect(requests[0].searchParams.get('calendar_id')).toBe('primary')
			expect(lastNode().config).toEqual({ event_id: 'evt-1', _names: { event_id: '주간 회의' } })
		})

		it('일정 칸에 지난 일정·반복 일정 안내를 붙인다', () => {
			renderPanel(createCalendarNode('google_calendar.delete'))

			expect(getFieldInput('일정')).toHaveAccessibleDescription(
				expect.stringContaining(
					'목록에는 지금 이후 일정만 보여요. 지난 일정이나 앞 노드가 찾은 일정은 참조식으로 넣어 주세요.'
				)
			)
		})

		it('일정 칸을 참조식으로 바꾸면 고른 값을 지우고 참조식을 저장하며, 값으로 돌아오면 다시 드롭다운이다', async () => {
			const user = userEvent.setup()
			const { lastNode } = renderPanel(
				createCalendarNode('google_calendar.update', { event_id: 'evt-1', _names: { event_id: '주간 회의' } })
			)

			const modes = screen.getByRole('radiogroup', { name: '일정 입력 방식' })
			await user.click(within(modes).getByRole('radio', { name: '참조식' }))
			expect(lastNode().config).toEqual({})

			await user.click(getFieldInput('일정'))
			await user.paste('{{nodes.find.output.items.0.id}}')
			expect(lastNode().config).toEqual({ event_id: '{{nodes.find.output.items.0.id}}' })

			await user.click(within(modes).getByRole('radio', { name: '값' }))
			expect(lastNode().config).toEqual({})
			expect(getFieldInput('일정')).toHaveAttribute('role', 'combobox')
		})

		it('저장된 참조식 일정은 참조식 방식으로 연다', () => {
			renderPanel(createCalendarNode('google_calendar.update', { event_id: '{{nodes.find.output.items.0.id}}' }))

			expect(getFieldInput('일정')).toHaveValue('{{nodes.find.output.items.0.id}}')
			expect(screen.getByRole('radio', { name: '참조식', checked: true })).toBeInTheDocument()
		})

		it('캘린더가 참조식이면 일정 목록을 막고 일정도 참조식으로 넣으라고 안내한다', () => {
			renderPanel(createCalendarNode('google_calendar.update', { calendar_id: '{{nodes.find.output.items.0.id}}' }))

			expect(
				screen.getByText("'캘린더' 칸이 참조식이라 목록에서 고를 수 없어요. 이 칸도 '참조식'으로 바꿔 넣어 주세요.")
			).toBeInTheDocument()
		})

		it('다른 앱의 드롭다운 칸에는 참조식 전환을 두지 않는다', () => {
			renderPanel(createNode())

			expect(screen.queryByRole('radiogroup', { name: '채널 입력 방식' })).not.toBeInTheDocument()
		})

		it('쓰기 가능한 캘린더 첫 페이지가 비어도 다음 페이지를 이어 읽어 항목을 보여 준다', async () => {
			const user = userEvent.setup()
			const requests = mockCalendarOptions({
				'google.writable_calendars': url =>
					url.searchParams.get('cursor') === 'next'
						? { items: [{ id: 'team@group.calendar.google.com', name: '팀 일정' }], nextCursor: null }
						: { items: [], nextCursor: 'next' },
			})
			renderPanel(createCalendarNode('google_calendar.create'))

			await user.click(getFieldInput('캘린더'))
			expect(await screen.findByRole('option', { name: /팀 일정/ })).toBeInTheDocument()
			expect(requests.map(url => url.searchParams.get('cursor'))).toEqual([null, 'next'])
			expect(screen.queryByRole('button', { name: '더 불러오기' })).not.toBeInTheDocument()
		})

		it('빈 페이지가 계속 이어지면 5페이지까지만 자동으로 읽고 더 불러오기를 보여 준다', async () => {
			const user = userEvent.setup()
			const requests = mockCalendarOptions({
				'google.writable_calendars': url => ({
					items: [],
					nextCursor: `${Number(url.searchParams.get('cursor') ?? 0) + 1}`,
				}),
			})
			renderPanel(createCalendarNode('google_calendar.create'))

			await user.click(getFieldInput('캘린더'))
			// 자동으로 읽는 동안에도 버튼이 '불러오는 중…'으로 보여, 요청이 멈춘 뒤의 버튼 이름으로 확인한다.
			await waitFor(() => expect(requests).toHaveLength(5))
			expect(await screen.findByRole('button', { name: '더 불러오기' })).toBeEnabled()
			expect(requests).toHaveLength(5)
		})

		describe('찾기 결과 종료 참조', () => {
			const findNode: WorkflowNodeDto = {
				id: 'find',
				type: 'ACTION',
				event: 'google_calendar.find',
				label: '오늘 일정 찾기',
				config: {},
			}

			const renderUpdate = (config: Record<string, unknown>) => {
				const node = createCalendarNode('google_calendar.update', config)
				renderWithProviders(
					<NodeSettingsPanel
						{...nodeTestProps}
						node={node}
						nodes={[findNode, node]}
						edges={[{ source: 'find', target: 'calendar' }]}
						onNodeChange={() => undefined}
						onClose={() => undefined}
					/>
				)
			}

			it('새 종료가 찾기 결과의 종료를 참조하면 하루 늘어난다고 경고한다', () => {
				renderUpdate({ end_datetime: '{{nodes.find.output.items.0.end}}' })

				expect(getFieldInput('새 종료')).toHaveAccessibleDescription(
					expect.stringContaining('찾기 결과의 종료는 종일 일정이면 다음 날이라, 그대로 넣으면 일정이 하루 늘어나요.')
				)
			})

			it('찾기 결과의 시작을 참조하면 경고하지 않는다', () => {
				renderUpdate({ end_datetime: '{{nodes.find.output.items.0.start}}' })

				expect(screen.queryByText(/그대로 넣으면 일정이 하루 늘어나요/)).not.toBeInTheDocument()
			})
		})
	})

	describe('서버 검사 오류', () => {
		const createValidationError = (field: string | null, message: string): WorkflowValidationErrorDto => ({
			nodeId: 'node-1',
			field,
			code: 'REQUIRED',
			message,
		})

		// 저장된 버전을 따로 주지 않으면 지금 노드를 저장본으로 본다.
		const renderWithValidationErrors = (
			node: WorkflowNodeDto,
			validationErrors: WorkflowValidationErrorDto[],
			validatedNode: WorkflowNodeDto = node
		) =>
			renderWithProviders(
				<NodeSettingsPanel
					{...nodeTestProps}
					node={node}
					onNodeChange={vi.fn()}
					onClose={() => undefined}
					validationErrors={validationErrors}
					validatedNode={validatedNode}
				/>
			)

		const createAgentNode = (tools: unknown[]) =>
			createNode({
				type: 'AI',
				event: 'ai.agent',
				config: { agentType: 'react', tools, llmProvider: 'CLAUDE', prompt: '요약해줘' },
			})
		const SLACK_TOOL_NAME = 'builtin:slack_send_channel_message'
		const SLACK_TOOL_TOGGLE = /^Slack 채널에 메시지 보내기(?!.*도구 빼기$)/

		const getUnmatchedSection = () => screen.getByRole('region', { name: '이 노드의 서버 검사 문제' })

		it('칸 path에 맞는 오류는 그 칸 아래에 서버 문구로 보여 주고 클라이언트 필수 경고와 함께 설명으로 연결한다', () => {
			renderWithValidationErrors(createNode(), [
				createValidationError('config.channel', '메시지를 보낼 채널을 골라 주세요.'),
			])

			const channel = getFieldInput('채널')
			expect(channel).toHaveAccessibleDescription(/필수 칸이 비어 있어요/)
			expect(channel).toHaveAccessibleDescription(/메시지를 보낼 채널을 골라 주세요\./)
			expect(screen.queryByRole('region', { name: '이 노드의 서버 검사 문제' })).not.toBeInTheDocument()
		})

		it('목록 칸의 하위 경로 오류는 그 목록 칸 아래에 붙인다', () => {
			renderWithValidationErrors(createNode({ event: 'test.typed', config: { tools: [{}, {}] } }), [
				createValidationError('config.tools.1.name', '도구 이름을 입력해 주세요.'),
			])

			// 읽기 전용 object 목록 칸은 입력 요소가 없어 라벨이 속한 칸 영역으로 확인한다.
			const fieldContainer = screen.getByText(/^도구/, { selector: 'label' }).closest('div')?.parentElement
			expect(fieldContainer).toHaveTextContent('도구 이름을 입력해 주세요.')
			expect(screen.queryByRole('region', { name: '이 노드의 서버 검사 문제' })).not.toBeInTheDocument()
		})

		it('field가 없거나 그리는 칸에 맞지 않는 오류는 패널 위쪽에 모아 보여 준다', () => {
			renderWithValidationErrors(createNode(), [
				createValidationError(null, '다음 노드와 연결되지 않았어요.'),
				createValidationError('config.removedField', '없어진 칸 오류'),
			])

			const section = getUnmatchedSection()
			expect(section).toHaveTextContent('이 노드의 서버 검사 문제 2건')
			expect(within(section).getByText('다음 노드와 연결되지 않았어요.')).toBeInTheDocument()
			expect(within(section).getByText('없어진 칸 오류')).toBeInTheDocument()
		})

		it('카탈로그 밖 노드는 그리는 칸이 없어 모든 오류를 패널 위쪽에 보여 준다', () => {
			renderWithValidationErrors(createNode({ event: 'unknown.event' }), [
				createValidationError('config.channel', '채널 오류'),
			])

			expect(within(getUnmatchedSection()).getByText('채널 오류')).toBeInTheDocument()
		})

		it('AI 도구 칸 오류는 접힌 도구 카드에 개수를 알리고, 펼치면 그 칸 아래에 보여 주며 도구 칸 자체 오류는 섹션에 둔다', async () => {
			const user = userEvent.setup()
			renderWithValidationErrors(createAgentNode([{ name: SLACK_TOOL_NAME, config: {} }]), [
				createValidationError('config.tools.0.config.text', '보낼 메시지를 입력해 주세요.'),
				createValidationError('config.tools', '도구 안 참조식이 앞 노드를 가리키지 않아요.'),
			])

			const section = screen.getByRole('region', { name: '도구' })
			expect(within(section).getByText('도구 안 참조식이 앞 노드를 가리키지 않아요.')).toBeInTheDocument()
			const toggle = within(section).getByRole('button', { name: SLACK_TOOL_TOGGLE })
			expect(toggle).toHaveTextContent('검사 문제 1건')

			await user.click(toggle)
			expect(getFieldInput('메시지')).toHaveAccessibleDescription(/보낼 메시지를 입력해 주세요\./)
		})
		it('저장 뒤 같은 자리에 다른 도구가 오면 그 도구 칸에 붙이지 않고 도구 섹션에 보여 준다', () => {
			renderWithValidationErrors(
				createAgentNode([{ name: SLACK_TOOL_NAME, config: {} }]),
				[createValidationError('config.tools.0.config.text', '저장된 0번 도구 오류')],
				createAgentNode([{ name: 'discord', config: {} }])
			)

			const section = screen.getByRole('region', { name: '도구' })
			expect(within(section).getByText('저장된 0번 도구 오류')).toBeInTheDocument()
			expect(within(section).getByRole('button', { name: SLACK_TOOL_TOGGLE })).not.toHaveTextContent('검사 문제')
		})

		it('설정이 저장된 버전과 다르면 서버 검사 결과가 저장된 버전 기준이라고 패널에서 알린다', () => {
			const validatedNode = createNode()
			const { rerender } = renderWithValidationErrors(
				validatedNode,
				[createValidationError('config.channel', '채널 오류')],
				validatedNode
			)
			expect(screen.queryByText(/저장된 버전 기준이에요/)).not.toBeInTheDocument()

			rerender(
				<NodeSettingsPanel
					{...nodeTestProps}
					node={createNode({ config: { brand: 'slack', text: '고친 메시지' } })}
					onNodeChange={vi.fn()}
					onClose={() => undefined}
					validationErrors={[createValidationError('config.channel', '채널 오류')]}
					validatedNode={validatedNode}
				/>
			)
			expect(
				screen.getByText('서버 검사 결과는 저장된 버전 기준이에요. 고친 내용은 저장하면 다시 검사해요.')
			).toBeInTheDocument()
		})
	})
})
