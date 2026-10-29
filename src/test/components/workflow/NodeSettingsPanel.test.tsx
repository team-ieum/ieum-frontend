import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'

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
			node={node}
			onNodeChange={next => {
				setNode(next)
				onNodeChange(next)
			}}
			onClose={() => undefined}
		/>
	)
}

// 입력 방식 radiogroup도 칸 이름으로 시작하는 aria-label을 가져 입력 요소만 고른다.
const getFieldInput = (title: string) => screen.getByLabelText(new RegExp(`^${title}`), { selector: 'input, textarea, select' })

const renderPanel = (initialNode: WorkflowNodeDto) => {
	const onNodeChange = vi.fn()
	render(<Harness initialNode={initialNode} onNodeChange={onNodeChange} />)
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
		expect(screen.getByRole('status')).toHaveTextContent('필수 칸 2개가 비어 있어요')
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
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
		expect(onNodeChange).not.toHaveBeenCalled()
	})

	it('choices 칸은 선택 상자로 id를 저장하고 참조식을 쓸 수 없으면 입력 방식을 숨긴다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode({ type: 'HTTP', event: 'http.request', config: {} }))

		expect(screen.queryByRole('radiogroup', { name: 'Method 입력 방식' })).not.toBeInTheDocument()
		await user.selectOptions(getFieldInput('Method'), 'POST')
		expect(lastNode().config).toEqual({ method: 'POST' })

		await user.selectOptions(getFieldInput('Method'), '')
		expect(lastNode().config).toEqual({})
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

		await user.selectOptions(getFieldInput('알림'), 'false')
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

	it('목록 공급원 칸은 ID 직접 입력을 받고 표시 이름을 보여 주다가 값이 바뀌면 지운다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(
			createNode({ config: { brand: 'slack', channel: 'C1', _names: { channel: '#general' } } })
		)

		expect(screen.getByText(/선택한 항목: #general/)).toBeInTheDocument()
		await user.type(getFieldInput('채널'), '2')

		expect(lastNode().config).toEqual({ brand: 'slack', channel: 'C12' })
		expect(screen.queryByText(/선택한 항목/)).not.toBeInTheDocument()
	})

	it('부모 칸을 바꾸면 연쇄로 지운 자식 칸 입력도 비운다', async () => {
		const user = userEvent.setup()
		mocks.entries = [
			{
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
				],
			},
		]
		const { lastNode } = renderPanel(
			createNode({ type: 'AI', event: 'ai.agent', config: { llmProvider: 'GEMINI', model: 'gemini-pro' } })
		)

		await user.selectOptions(getFieldInput('AI 제공자'), 'CLAUDE')

		expect(lastNode().config).toEqual({ llmProvider: 'CLAUDE' })
		expect(getFieldInput('모델')).toHaveValue('')
		await user.type(getFieldInput('모델'), 'c')
		expect(lastNode().config).toEqual({ llmProvider: 'CLAUDE', model: 'c' })
	})

	it('패널 밖에서 노드 값이 바뀌면 다시 마운트하지 않고 칸 입력을 새 값으로 맞춘다', () => {
		const panelProps = { onNodeChange: vi.fn(), onClose: vi.fn() }
		const { rerender } = render(
			<NodeSettingsPanel
				node={createNode({ event: 'test.typed', config: { count: 1, headers: { A: '1' } } })}
				{...panelProps}
			/>
		)
		const panel = screen.getByRole('complementary', { name: '노드 설정' })

		rerender(
			<NodeSettingsPanel
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
		const { unmount } = render(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />)
		expect(screen.getByRole('status', { name: '설정 칸 불러오는 중' })).toHaveAttribute('aria-busy', 'true')
		unmount()

		mocks.isError = true
		render(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />)
		await user.click(screen.getByRole('button', { name: '다시 시도' }))
		expect(mocks.refetch).toHaveBeenCalled()
	})

	it('닫기 버튼과 Escape로 닫는다', async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()
		render(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={onClose} />)

		await user.click(screen.getByRole('button', { name: '노드 설정 닫기' }))
		await user.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledTimes(2)
	})
})
