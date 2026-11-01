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

/** 설정 드롭다운을 열고 `{title} 목록`에서 항목을 고른다. */
const chooseFromDropdown = async (user: ReturnType<typeof userEvent.setup>, title: string, optionName: string) => {
	await user.click(getFieldInput(title))
	const listbox = await screen.findByRole('listbox', { name: `${title} 목록` })
	await user.click(within(listbox).getByRole('option', { name: optionName }))
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
			renderWithProviders(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={onClose} />)

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
			renderWithProviders(<NodeSettingsPanel node={createNode()} onNodeChange={onNodeChange} onClose={onClose} />)
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

	it('패널 밖에서 노드 값이 바뀌면 다시 마운트하지 않고 칸 입력을 새 값으로 맞춘다', () => {
		const panelProps = { onNodeChange: vi.fn(), onClose: vi.fn() }
		const { rerender } = renderWithProviders(
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
		const { unmount } = renderWithProviders(
			<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />
		)
		expect(screen.getByRole('status', { name: '설정 칸 불러오는 중' })).toHaveAttribute('aria-busy', 'true')
		unmount()

		mocks.isError = true
		renderWithProviders(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={vi.fn()} />)
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
		renderWithProviders(<NodeSettingsPanel node={createNode()} onNodeChange={vi.fn()} onClose={onClose} />)

		await user.click(screen.getByRole('button', { name: '노드 설정 닫기' }))
		await user.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledTimes(2)
	})
})
