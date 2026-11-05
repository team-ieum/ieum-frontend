import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { NODE_SAMPLE_PATH } from '@/mocks/nodeTestHandlers'
import { server } from '@/mocks/server'
import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { createTestQueryClient } from '@/test/createTestQueryClient'

/**
 * 설정 패널 칸의 출력 참조 피커를 패널째로 확인한다.
 * 조상 계산·경로 규칙의 세부 경우는 `getAncestorNodeIds`·`getNodeOutputPaths` 단위 테스트가 맡는다.
 */

const mocks = vi.hoisted(() => ({ entries: [] as NodeCatalogEntry[] }))

vi.mock('@/hooks/workflow/queries/useNodeCatalogQuery', () => ({
	useNodeCatalogQuery: () => ({
		data: { data: { entries: mocks.entries } },
		isPending: false,
		isError: false,
		isFetching: false,
		refetch: vi.fn(),
	}),
}))

const typedEntry: NodeCatalogEntry = {
	id: 'test.typed',
	kind: 'action',
	provider: 'ieum',
	app: 'test',
	appTitle: '테스트',
	nodeType: 'ACTION',
	title: '여러 칸 작업',
	fixed: { type: 'ACTION', event: 'test.typed', config: {} },
	inputFields: [
		{ key: 'count', title: '개수', type: 'integer', path: 'config.count' },
		{ key: 'payload', title: '본문 JSON', type: 'json', path: 'config.payload' },
		{ key: 'headers', title: '헤더', type: 'dict', ref: false, path: 'config.headers' },
	],
	outputFields: [],
}

const WORKFLOW_ID = 'workflow-1'

const createNode = (id: string, event: string, label: string, config: Record<string, unknown> = {}): WorkflowNodeDto => ({
	id,
	type: 'ACTION',
	event,
	label,
	config,
})

// trigger → ai → http → target → after, lonely는 연결되지 않은 노드다.
const baseNodes = [
	createNode('trigger', 'manual.run', '수동 실행'),
	createNode('ai', 'ai.reasoning', 'AI 요약', { outputFields: [{ key: 'summary', type: 'text' }] }),
	createNode('http', 'http.request', '상태 확인'),
	createNode('after', 'gmail.new_email', '뒤 노드'),
	createNode('lonely', 'schedule.every', '따로 노드'),
]
const chainEdges: WorkflowEdgeDto[] = [
	{ source: 'trigger', target: 'ai' },
	{ source: 'ai', target: 'http' },
	{ source: 'http', target: 'target' },
	{ source: 'target', target: 'after' },
]

const Harness = ({
	initialNode,
	edges,
	onNodeChange,
	onClose,
}: {
	initialNode: WorkflowNodeDto
	edges: WorkflowEdgeDto[]
	onNodeChange: (node: WorkflowNodeDto) => void
	onClose: () => void
}) => {
	const [node, setNode] = useState(initialNode)
	return (
		<NodeSettingsPanel
			workflowId={WORKFLOW_ID}
			node={node}
			nodes={[...baseNodes, node]}
			edges={edges}
			onNodeChange={next => {
				setNode(next)
				onNodeChange(next)
			}}
			onNodeOpen={() => undefined}
			onClose={onClose}
		/>
	)
}

const renderPanel = (initialNode: WorkflowNodeDto, edges: WorkflowEdgeDto[] = chainEdges) => {
	const onNodeChange = vi.fn()
	const onClose = vi.fn()
	const queryClient = createTestQueryClient()
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>{children}</MemoryRouter>
		</QueryClientProvider>
	)
	render(<Harness initialNode={initialNode} edges={edges} onNodeChange={onNodeChange} onClose={onClose} />, {
		wrapper: Wrapper,
	})
	return { onClose, lastNode: () => onNodeChange.mock.lastCall?.[0] as WorkflowNodeDto }
}

const getFieldInput = (title: string) =>
	screen.getByLabelText(new RegExp(`^${title}`), { selector: 'input, textarea' }) as HTMLInputElement | HTMLTextAreaElement

const getPicker = (title: string) => screen.getByRole('combobox', { name: `출력 참조 넣기(${title})` })

const createTarget = (config: Record<string, unknown> = {}) =>
	createNode('target', 'slack_bot.send_channel_message', '요약 보내기', { brand: 'slack', ...config })

describe('NodeReferencePicker', () => {
	beforeEach(() => {
		mocks.entries = [...nodeCatalogEntriesFixture, typedEntry]
	})

	it('조상 노드만 가까운 순서로 묶어 보여 주고 뒤쪽·연결 안 된 노드는 보여 주지 않는다', async () => {
		const user = userEvent.setup()
		renderPanel(createTarget())

		await user.click(getPicker('메시지'))

		const listbox = screen.getByRole('listbox', { name: '메시지 참조 후보' })
		const groups = within(listbox).getAllByRole('group')
		expect(groups.map(group => group.firstChild?.textContent)).toEqual([
			'상태 확인 · HTTP 요청 보내기',
			'AI 요약 · AI 답변 만들기',
			'수동 실행 · 직접 실행할 때',
		])
		expect(within(groups[0]).getByRole('option', { name: /상태 코드/ })).toHaveTextContent('status')
		// ai.reasoning은 선언한 출력 칸이 정적 출력(output)을 대체한다.
		expect(
			within(groups[1])
				.getAllByRole('option')
				.map(option => option.textContent)
		).toEqual(['summarysummary'])
		// 샘플이 없는 동적 출력 노드는 테스트 안내만 보여 준다.
		expect(await within(groups[2]).findByText("'수동 실행' 노드를 테스트하면 출력 칸을 고를 수 있어요.")).toBeInTheDocument()
		expect(within(listbox).queryByText(/뒤 노드|따로 노드/)).not.toBeInTheDocument()
	})

	it('키보드로 고르면 문자열 칸의 커서 위치에 넣고 포커스를 칸으로 돌려준다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createTarget({ text: '안녕 끝' }))
		const textarea = getFieldInput('메시지')
		await user.click(textarea)
		textarea.setSelectionRange(3, 3)
		fireEvent.keyUp(textarea, { key: 'ArrowLeft' })

		getPicker('메시지').focus()
		await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

		const expression = '{{nodes.http.output.status}}'
		expect(lastNode().config.text).toBe(`안녕 ${expression}끝`)
		await waitFor(() => expect(textarea).toHaveFocus())
		expect(textarea.selectionStart).toBe(3 + expression.length)
		expect(screen.queryByRole('listbox', { name: '메시지 참조 후보' })).not.toBeInTheDocument()
	})

	it('값 방식 정수 칸에서 고르면 참조식 방식으로 바꾸고 값 전체를 참조식으로 둔다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode('target', 'test.typed', '여러 칸'))

		await user.click(getPicker('개수'))
		await user.click(screen.getByRole('option', { name: /상태 코드/ }))

		expect(lastNode().config.count).toBe('{{nodes.http.output.status}}')
		expect(
			within(screen.getByRole('radiogroup', { name: '개수 입력 방식' })).getByRole('radio', { name: '참조식' })
		).toHaveAttribute('aria-checked', 'true')
		await waitFor(() => expect(getFieldInput('개수')).toHaveFocus())
		expect(getFieldInput('개수')).toHaveValue('{{nodes.http.output.status}}')
	})

	it('빈 json 칸에서 고르면 참조식 방식으로 바꿔 JSON 오류 없이 저장한다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode('target', 'test.typed', '여러 칸'))

		await user.click(getPicker('본문 JSON'))
		await user.click(screen.getByRole('option', { name: /상태 코드/ }))

		expect(lastNode().config.payload).toBe('{{nodes.http.output.status}}')
		expect(screen.queryByText('JSON 형식이 올바르지 않아요.')).not.toBeInTheDocument()
		expect(
			within(screen.getByRole('radiogroup', { name: '본문 JSON 입력 방식' })).getByRole('radio', { name: '참조식' })
		).toHaveAttribute('aria-checked', 'true')
	})

	it('내용이 있는 json 칸에서는 커서 위치에 넣는다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(createNode('target', 'test.typed', '여러 칸', { payload: '{"a":""}' }))
		const textarea = getFieldInput('본문 JSON')
		await user.click(textarea)
		textarea.setSelectionRange(6, 6)
		fireEvent.keyUp(textarea, { key: 'ArrowLeft' })

		await user.click(getPicker('본문 JSON'))
		await user.click(screen.getByRole('option', { name: /상태 코드/ }))

		expect(lastNode().config.payload).toBe('{"a":"{{nodes.http.output.status}}"}')
	})

	it('참조식을 쓸 수 없는 칸에는 피커가 없다', () => {
		renderPanel(createNode('target', 'test.typed', '여러 칸'))
		expect(screen.queryByRole('combobox', { name: '출력 참조 넣기(헤더)' })).not.toBeInTheDocument()
	})

	it('목록 공급원 드롭다운 칸에는 피커가 없다', () => {
		renderPanel(createTarget())
		expect(screen.queryByRole('combobox', { name: '출력 참조 넣기(채널)' })).not.toBeInTheDocument()
		expect(getPicker('스레드')).toBeInTheDocument()
	})

	it('AI 도구 칸에도 피커가 있고 도구 config 경로에 저장한다', async () => {
		const user = userEvent.setup()
		const { lastNode } = renderPanel(
			createNode('target', 'ai.agent', '에이전트', {
				llmProvider: 'CLAUDE',
				tools: [{ name: 'builtin:slack_send_channel_message', config: {} }],
			})
		)

		await user.click(screen.getByRole('button', { name: /Slack 채널에 메시지 보내기/, expanded: false }))
		const toolPickers = screen.getAllByRole('combobox', { name: '출력 참조 넣기(메시지)' })
		await user.click(toolPickers[0])
		await user.click(screen.getByRole('option', { name: /summary/ }))

		expect(lastNode().config.tools).toEqual([
			{ name: 'builtin:slack_send_channel_message', config: { text: '{{nodes.ai.output.summary}}' } },
		])
	})

	it('Escape는 참조 목록만 닫고 설정 패널은 닫지 않는다', async () => {
		const user = userEvent.setup()
		const { onClose } = renderPanel(createTarget())

		await user.click(getPicker('메시지'))
		await user.keyboard('{Escape}')

		expect(screen.queryByRole('listbox', { name: '메시지 참조 후보' })).not.toBeInTheDocument()
		expect(onClose).not.toHaveBeenCalled()
		expect(getPicker('메시지')).toHaveFocus()
	})

	it('앞에 연결된 노드가 없으면 안내를 보여 준다', async () => {
		const user = userEvent.setup()
		renderPanel(createTarget(), [])

		await user.click(getPicker('메시지'))

		expect(screen.getByText(/앞에 연결된 노드가 없어요/)).toBeInTheDocument()
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('동적 출력 조상은 샘플을 받는 동안 불러오는 중을 보여 주고 받은 샘플로 경로를 만든다', async () => {
		const user = userEvent.setup()
		let release = () => {}
		const gate = new Promise<void>(resolve => {
			release = resolve
		})
		server.use(
			http.get(NODE_SAMPLE_PATH, async () => {
				await gate
				return HttpResponse.json({
					success: true,
					data: { status: 'SUCCESS', output: { body: { name: '홍길동' } } },
					message: 'OK',
					code: 'OK',
				})
			})
		)
		renderPanel(createTarget())

		await user.click(getPicker('메시지'))
		expect(screen.getByText('출력 칸을 불러오는 중이에요')).toBeInTheDocument()

		release()
		expect(await screen.findByRole('option', { name: /body › name/ })).toHaveTextContent('body.name')
		expect(screen.queryByText('출력 칸을 불러오는 중이에요')).not.toBeInTheDocument()
	})
})
