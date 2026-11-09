import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Modal from '@/components/common/Modal'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import NodeTestSection from '@/components/workflow/settings/NodeTestSection'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { NODE_SAMPLE_PATH, NODE_TEST_PATH } from '@/mocks/nodeTestHandlers'
import { server } from '@/mocks/server'
import { WEBHOOK_TOKEN_PATH } from '@/mocks/webhookTokenHandlers'
import { queryKeys } from '@/constants/queryKeys'
import type { NodeTestRequest, NodeTestResult } from '@/types/nodeTest'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { createTestQueryClient } from '@/test/createTestQueryClient'

const WORKFLOW_ID = 'workflow-1'

const findEntry = (id: string) => nodeCatalogEntriesFixture.find(entry => entry.id === id)

const slackNode: WorkflowNodeDto = {
	id: 'slack-1',
	type: 'ACTION',
	event: 'slack_bot.send_channel_message',
	label: '채널에 알리기',
	config: { brand: 'slack', channel: 'C1', text: '저장 전에 고친 문구' },
}

const triggerNode: WorkflowNodeDto = {
	id: 'trigger-1',
	type: 'TRIGGER',
	event: 'manual.run',
	label: '직접 실행',
	config: { brand: 'ieum' },
}

const aiNode: WorkflowNodeDto = { id: 'ai-1', type: 'AI', event: 'ai.reasoning', label: 'AI 요약', config: {} }

const ok = (data: NodeTestResult) => HttpResponse.json({ success: true, data, message: 'OK', code: 'OK' })
const apiError = (code: string, status: number, data: unknown = null, message = '오류') =>
	HttpResponse.json({ success: false, data, message, code }, { status })

/** 테스트 요청 body를 모아 저장 전 노드를 보냈는지 확인한다. */
const observeTestRequests = (response: () => Response = () => ok({ status: 'SUCCESS', output: { ts: '1.2' } })) => {
	const bodies: NodeTestRequest[] = []
	server.use(
		http.post(NODE_TEST_PATH, async ({ request }) => {
			bodies.push((await request.json()) as NodeTestRequest)
			return response()
		})
	)
	return bodies
}

const renderWithProviders = (ui: ReactElement) => {
	const queryClient = createTestQueryClient()
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				{children}
				<Modal />
			</MemoryRouter>
		</QueryClientProvider>
	)
	return { ...render(ui, { wrapper: Wrapper }), queryClient }
}

type RenderSectionOptions = {
	nodes?: WorkflowNodeDto[]
	onNodeOpen?: (id: string) => void
	/** 기본은 렌더하는 노드 그대로 저장된 상태다. */
	savedNode?: WorkflowNodeDto | null
	isWorkflowActive?: boolean
}

const renderSection = (node: WorkflowNodeDto, options: RenderSectionOptions = {}) => {
	const onNodeOpen = options.onNodeOpen ?? vi.fn()
	const props = {
		workflowId: WORKFLOW_ID,
		entry: findEntry(node.event),
		nodes: options.nodes ?? [node],
		onNodeOpen,
		savedNode: options.savedNode === null ? undefined : (options.savedNode ?? node),
		isWorkflowActive: options.isWorkflowActive ?? false,
	}
	const result = renderWithProviders(<NodeTestSection node={node} {...props} />)
	return {
		...result,
		onNodeOpen,
		rerenderNode: (next: WorkflowNodeDto) => result.rerender(<NodeTestSection node={next} {...props} />),
	}
}

const getTestButton = () => screen.getByRole('button', { name: '테스트' })

describe('NodeTestSection', () => {
	it('패널을 열면 최신 샘플을 불러오는 동안 skeleton을, 받은 뒤 이전 결과를 보여 준다', async () => {
		server.use(
			http.get(NODE_SAMPLE_PATH, () =>
				ok({ status: 'SUCCESS', output: { subject: '문의' }, testedAt: '2026-11-02T09:05:30' })
			)
		)
		renderSection(triggerNode)

		expect(screen.getByRole('status', { name: '이전 테스트 결과 불러오는 중' })).toHaveAttribute('aria-busy', 'true')
		expect(await screen.findByText('성공')).toBeInTheDocument()
		expect(screen.getByText('11월 2일 09:05')).toBeInTheDocument()
		expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"subject": "문의"')
		expect(screen.queryByRole('status', { name: '이전 테스트 결과 불러오는 중' })).not.toBeInTheDocument()
	})

	it('샘플이 없으면 아직 테스트하지 않았다고 알린다', async () => {
		renderSection(triggerNode)

		expect(await screen.findByText('아직 테스트하지 않았어요.')).toBeInTheDocument()
	})

	it('샘플 조회에 실패해도 테스트 버튼은 쓸 수 있고 다시 시도로 다시 불러온다', async () => {
		const user = userEvent.setup()
		let failsSample = true
		server.use(
			http.get(NODE_SAMPLE_PATH, () =>
				failsSample ? apiError('INTERNAL_SERVER_ERROR', 500) : ok({ status: 'FAILED', error: '이전 실패' })
			)
		)
		renderSection(triggerNode)

		expect(await screen.findByText('이전 테스트 결과를 불러오지 못했어요.')).toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()

		failsSample = false
		await user.click(screen.getByRole('button', { name: '다시 시도' }))
		expect(await screen.findByText('이전 실패')).toBeInTheDocument()
	})

	it('action 노드는 실제 실행을 확인받고, 취소하면 요청하지 않는다', async () => {
		const user = userEvent.setup()
		const bodies = observeTestRequests()
		renderSection(slackNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())
		const dialog = screen.getByRole('alertdialog', { name: '노드를 실제로 실행할까요?' })
		expect(dialog).toHaveTextContent('메시지·요청이 그대로 보내지고, AI 노드는 사용량이 차감돼요.')
		await user.click(within(dialog).getByRole('button', { name: '취소' }))

		// 모달은 닫힘 애니메이션이 끝난 뒤 빠진다.
		await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
		expect(bodies).toEqual([])
	})

	it('확인하면 저장 전 편집 중인 노드를 그대로 보내고 결과를 보여 준다', async () => {
		const user = userEvent.setup()
		const bodies = observeTestRequests(() =>
			ok({ status: 'SUCCESS', output: { ts: '1.2', token: '***' }, testedAt: '2026-11-02T10:00:00' })
		)
		const { queryClient } = renderSection(slackNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())
		await user.click(screen.getByRole('button', { name: '테스트 실행' }))

		expect(await screen.findByText('성공')).toBeInTheDocument()
		expect(bodies).toEqual([{ node: slackNode }])
		expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"token": "***"')
		// 피커가 같은 샘플을 다시 조회하지 않고 쓰도록 샘플 캐시도 맞춘다.
		expect(queryClient.getQueryData(['node-test-samples', WORKFLOW_ID, slackNode.id])).toMatchObject({ status: 'SUCCESS' })
	})

	it('trigger 노드는 확인 없이 바로 실행한다', async () => {
		const user = userEvent.setup()
		const bodies = observeTestRequests()
		renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())

		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		await waitFor(() => expect(bodies).toEqual([{ node: triggerNode }]))
	})

	it('실행에 실패하면 HTTP 200 FAILED의 error를 보여 준다', async () => {
		const user = userEvent.setup()
		observeTestRequests(() => ok({ status: 'FAILED', error: '최근 항목이 없습니다', testedAt: '2026-11-02T10:00:00' }))
		renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())

		expect(await screen.findByText('실패')).toBeInTheDocument()
		expect(screen.getByText('최근 항목이 없습니다')).toBeInTheDocument()
	})

	it('실행 중에는 버튼을 끄고 진행 중임을 알린다', async () => {
		const user = userEvent.setup()
		let release!: () => void
		const released = new Promise<void>(resolve => {
			release = resolve
		})
		server.use(
			http.post(NODE_TEST_PATH, async () => {
				await released
				return ok({ status: 'SUCCESS', output: {} })
			})
		)
		renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())

		expect(await screen.findByRole('button', { name: '테스트 중…' })).toBeDisabled()
		expect(screen.getByRole('status', { name: '테스트 실행 중' })).toBeInTheDocument()
		release()
		expect(await screen.findByText('성공')).toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()
	})

	it('TEST_SAMPLE_MISSING이면 먼저 테스트할 노드를 라벨로 보여 주고 열기로 그 노드를 연다', async () => {
		const user = userEvent.setup()
		observeTestRequests(() =>
			apiError(
				'TEST_SAMPLE_MISSING',
				400,
				{ missingNodeIds: ['ai-1', 'deleted-node'] },
				'먼저 테스트해야 하는 노드가 있습니다: ai-1'
			)
		)
		const { onNodeOpen } = renderSection(triggerNode, { nodes: [triggerNode, aiNode] })
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent('이 노드가 참조하는 앞 노드를 먼저 테스트해 주세요.')
		expect(alert).toHaveTextContent('AI 요약')
		// 편집 문서에 없는 노드는 열 수 없으므로 id만 보여 준다.
		expect(alert).toHaveTextContent('deleted-node')
		expect(within(alert).queryByRole('button', { name: 'deleted-node 노드 열기' })).not.toBeInTheDocument()

		await user.click(within(alert).getByRole('button', { name: 'AI 요약 노드 열기' }))
		expect(onNodeOpen).toHaveBeenCalledWith('ai-1')
	})

	it.each([
		['PROVIDER_ERROR', 502, 'AI 제공자가 응답하지 않아요. 잠시 후 다시 시도해 주세요.'],
		['UNAUTHORIZED', 401, '로그인이 만료됐어요. 다시 로그인한 뒤 테스트해 주세요.'],
	])('%s 오류는 서버 message 대신 안내 문구를 보여 준다', async (code, status, message) => {
		const user = userEvent.setup()
		observeTestRequests(() => apiError(code, status, null, 'LLM 프로바이더 내부 문구'))
		renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())

		expect(await screen.findByRole('alert')).toHaveTextContent(message)
		expect(screen.queryByText(/LLM 프로바이더/)).not.toBeInTheDocument()
	})

	it('이번에 실행한 뒤 설정을 바꾸면 결과가 바꾸기 전 기준이라고 알리고, 위치만 바뀌면 알리지 않는다', async () => {
		const user = userEvent.setup()
		observeTestRequests()
		const { rerenderNode } = renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')
		await user.click(getTestButton())
		await screen.findByText('성공')

		rerenderNode({ ...triggerNode, position: { x: 10, y: 20 }, label: '이름만 바꿈' })
		expect(screen.queryByText('설정을 바꿨어요. 결과는 바꾸기 전 기준이에요.')).not.toBeInTheDocument()

		rerenderNode({ ...triggerNode, config: { brand: 'ieum', note: '바뀐 값' } })
		expect(screen.getByText('설정을 바꿨어요. 결과는 바꾸기 전 기준이에요.')).toBeInTheDocument()
	})

	it('설정을 바꾼 뒤 다시 실행해 성공하면 새 결과로 바꾸고 바꾸기 전 기준 안내를 지운다', async () => {
		const user = userEvent.setup()
		let requestCount = 0
		server.use(
			http.post(NODE_TEST_PATH, () => {
				requestCount += 1
				return ok({ status: 'SUCCESS', output: { run: requestCount } })
			})
		)
		const { rerenderNode } = renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')
		await user.click(getTestButton())
		await waitFor(() => expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"run": 1'))

		rerenderNode({ ...triggerNode, config: { brand: 'ieum', note: '바뀐 값' } })
		expect(screen.getByText('설정을 바꿨어요. 결과는 바꾸기 전 기준이에요.')).toBeInTheDocument()
		await user.click(getTestButton())

		await waitFor(() => expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"run": 2'))
		expect(screen.queryByText('설정을 바꿨어요. 결과는 바꾸기 전 기준이에요.')).not.toBeInTheDocument()
	})

	it('설정을 바꾼 뒤 다시 실행하는 중이거나 실패해도 이전 결과가 바꾸기 전 기준이라고 계속 알린다', async () => {
		const user = userEvent.setup()
		const outdatedNotice = '설정을 바꿨어요. 결과는 바꾸기 전 기준이에요.'
		let release!: () => void
		const released = new Promise<void>(resolve => {
			release = resolve
		})
		let requestCount = 0
		// 첫 실행은 성공하고, 설정을 바꾼 뒤 다시 실행한 요청은 보류했다가 400으로 실패시킨다.
		server.use(
			http.post(NODE_TEST_PATH, async () => {
				requestCount += 1
				if (requestCount === 1) return ok({ status: 'SUCCESS', output: { before: true } })
				await released
				return apiError('INVALID_INPUT', 400, null, '채널 값이 올바르지 않습니다.')
			})
		)
		const { rerenderNode } = renderSection(triggerNode)
		await screen.findByText('아직 테스트하지 않았어요.')
		await user.click(getTestButton())
		await screen.findByText('성공')

		rerenderNode({ ...triggerNode, config: { brand: 'ieum', note: '바뀐 값' } })
		await user.click(getTestButton())

		expect(await screen.findByRole('button', { name: '테스트 중…' })).toBeDisabled()
		expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"before": true')
		expect(screen.getByText(outdatedNotice)).toBeInTheDocument()

		release()
		expect(await screen.findByRole('alert')).toHaveTextContent('채널 값이 올바르지 않습니다.')
		expect(screen.getByLabelText('테스트 출력')).toHaveTextContent('"before": true')
		expect(screen.getByText(outdatedNotice)).toBeInTheDocument()
	})
})

describe('NodeSettingsPanel 노드 테스트 영역', () => {
	it('카탈로그에 없는 노드도 테스트 영역을 보여 주되 버튼을 끄고 이유를 알린다', async () => {
		renderWithProviders(
			<NodeSettingsPanel
				workflowId={WORKFLOW_ID}
				node={{ id: 'legacy-1', type: 'ACTION', event: 'legacy.unknown', label: '옛 노드', config: {} }}
				nodes={[]}
				edges={[]}
				onNodeChange={vi.fn()}
				onNodeOpen={vi.fn()}
				onClose={vi.fn()}
			/>
		)

		const section = await screen.findByRole('region', { name: '노드 테스트' })
		expect(within(section).getByRole('button', { name: '테스트' })).toBeDisabled()
		expect(section).toHaveTextContent('지원하지 않는 작업이라 테스트할 수 없어요.')
	})
})

const webhookNode: WorkflowNodeDto = {
	id: 'hook-1',
	type: 'TRIGGER',
	event: 'webhook.catch',
	label: '주문 웹훅',
	config: { brand: 'ieum' },
}

const PREVIOUS_SAMPLE: NodeTestResult = { status: 'SUCCESS', output: { previous: true }, testedAt: '2026-11-09T09:00:00' }
/** 서버가 지금(테스트 시계) 기록한 샘플. 수신 판정은 대기 시작 시각과 `testedAt`을 비교한다. */
const sampleRecordedNow = (output: Record<string, unknown>): NodeTestResult => ({
	status: 'SUCCESS',
	output,
	testedAt: new Date(Date.now()).toISOString(),
})

const okData = (data: unknown) => HttpResponse.json({ success: true, data, message: 'OK', code: 'OK' })

const mockTokenStatus = (...statuses: boolean[]) => {
	const requested = vi.fn()
	server.use(
		http.get(WEBHOOK_TOKEN_PATH, () => {
			requested()
			const issued = statuses[Math.min(requested.mock.calls.length, statuses.length) - 1]
			return okData({ issued, issuedAt: issued ? '2026-11-09T05:00:00Z' : null })
		})
	)
	return requested
}

/** 수신 대기 중 받는 샘플을 테스트에서 바꾸고, 샘플 조회 횟수를 센다. */
const mockSampleSource = (initial: NodeTestResult | null) => {
	const source = { current: initial, requested: vi.fn() }
	server.use(
		http.get(NODE_SAMPLE_PATH, () => {
			source.requested()
			return source.current ? ok(source.current) : apiError('TEST_SAMPLE_NOT_FOUND', 404)
		})
	)
	return source
}

const respondListening = () =>
	observeTestRequests(() => ok({ status: 'LISTENING', expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() }))

describe('NodeTestSection webhook.catch', () => {
	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it('수신 주소가 없으면 테스트를 끄고, 주소를 만들면 전체 주소를 보여 주고 복사한다', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		const user = userEvent.setup()
		mockTokenStatus(false)
		server.use(
			http.post(WEBHOOK_TOKEN_PATH, () =>
				okData({ token: 'tok-1', path: '/api/v1/hooks/tok-1', issuedAt: '2026-11-09T05:00:00Z' })
			)
		)
		renderSection(webhookNode)

		expect(await screen.findByText('수신 주소를 먼저 만들어 주세요.')).toBeInTheDocument()
		expect(getTestButton()).toBeDisabled()

		await user.click(screen.getByRole('button', { name: '수신 주소 만들기' }))

		const address = await screen.findByRole('textbox', { name: '수신 주소' })
		expect(address).toHaveValue('https://api.example.com/api/v1/hooks/tok-1')
		expect(screen.getByText(/이 주소는 지금만 볼 수 있어요/)).toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()

		await user.click(screen.getByRole('button', { name: '복사' }))

		expect(await screen.findByText(/주소를 복사했어요/)).toBeInTheDocument()
		await expect(navigator.clipboard.readText()).resolves.toBe('https://api.example.com/api/v1/hooks/tok-1')
	})

	it('이미 만든 주소는 다시 보여 주지 않고, 새 주소는 이전 주소가 끊긴다는 확인을 받은 뒤 만든다', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com')
		const user = userEvent.setup()
		mockTokenStatus(true)
		const issueRequested = vi.fn()
		server.use(
			http.post(WEBHOOK_TOKEN_PATH, () => {
				issueRequested()
				return okData({ token: 'tok-2', path: '/api/v1/hooks/tok-2', issuedAt: '2026-11-09T06:00:00Z' })
			})
		)
		renderSection(webhookNode)

		expect(await screen.findByText(/주소는 만들 때만 보여 줘요/)).toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: '수신 주소' })).not.toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()

		await user.click(screen.getByRole('button', { name: '새 주소 만들기' }))
		const dialog = screen.getByRole('alertdialog', { name: '새 수신 주소를 만들까요?' })
		expect(dialog).toHaveTextContent('지금 쓰는 주소는 바로 끊겨요.')
		expect(issueRequested).not.toHaveBeenCalled()

		await user.click(within(dialog).getByRole('button', { name: '새 주소 만들기' }))

		expect(await screen.findByRole('textbox', { name: '수신 주소' })).toHaveValue(
			'https://api.example.com/api/v1/hooks/tok-2'
		)
		expect(issueRequested).toHaveBeenCalledTimes(1)
	})

	it('새 주소 만들기 확인을 취소하면 발급하지 않는다', async () => {
		const user = userEvent.setup()
		mockTokenStatus(true)
		const issueRequested = vi.fn()
		server.use(
			http.post(WEBHOOK_TOKEN_PATH, () => {
				issueRequested()
				return okData({ token: 'tok-x', path: '/api/v1/hooks/tok-x', issuedAt: '2026-11-09T06:00:00Z' })
			})
		)
		renderSection(webhookNode)

		await user.click(await screen.findByRole('button', { name: '새 주소 만들기' }))
		const dialog = screen.getByRole('alertdialog', { name: '새 수신 주소를 만들까요?' })
		await user.click(within(dialog).getByRole('button', { name: '취소' }))

		// 확인 창의 닫힘 애니메이션은 이 파일의 앞선 테스트 뒤 jsdom에서 끝나지 않을 때가 있어 DOM 제거를 기다리지 않는다.
		// 대신 취소 뒤에 보낸 테스트 요청이 끝날 때까지 발급 요청이 없었는지로 확인한다.
		respondListening()
		await user.click(getTestButton())
		await screen.findByRole('status', { name: '수신 대기 중' })
		expect(issueRequested).not.toHaveBeenCalled()
		expect(screen.queryByRole('textbox', { name: '수신 주소' })).not.toBeInTheDocument()
	})

	it.each([
		['저장본과 설정이 다르면', { ...webhookNode, config: { brand: 'ieum', includeRaw: true } }],
		['아직 저장하지 않은 노드면', null],
	])('%s 테스트를 끄고 저장을 안내한다', async (_, savedNode) => {
		mockTokenStatus(true)
		renderSection(webhookNode, { savedNode })

		expect(await screen.findByText(/주소는 만들 때만 보여 줘요/)).toBeInTheDocument()
		expect(screen.getByText('저장한 뒤 테스트할 수 있어요. 받은 요청은 저장된 설정으로 처리돼요.')).toBeInTheDocument()
		expect(getTestButton()).toBeDisabled()
	})

	it('워크플로우가 켜져 있으면 테스트로 받은 요청도 실행된다고 알린다', async () => {
		mockTokenStatus(true)
		renderSection(webhookNode, { isWorkflowActive: true })

		expect(await screen.findByText('워크플로우가 켜져 있어서 테스트로 받은 요청도 실제로 실행돼요.')).toBeInTheDocument()
	})

	it('수신 대기를 시작하면 5초마다 샘플을 확인하고, 대기를 시작한 뒤 기록된 샘플을 받으면 결과를 보여 주고 멈춘다', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		mockTokenStatus(true)
		const sample = mockSampleSource(PREVIOUS_SAMPLE)
		const bodies = respondListening()
		renderSection(webhookNode)
		expect(await screen.findByLabelText('테스트 출력')).toHaveTextContent('"previous": true')

		await user.click(getTestButton())

		const listening = await screen.findByRole('status', { name: '수신 대기 중' })
		expect(listening).toHaveTextContent(/남은 시간 [45]:\d{2}/)
		expect(screen.getByRole('button', { name: '대기 중…' })).toBeDisabled()
		expect(bodies[0]?.node).toEqual(webhookNode)
		const requestsBeforePoll = sample.requested.mock.calls.length

		await act(async () => vi.advanceTimersByTimeAsync(5_000))
		await waitFor(() => expect(sample.requested).toHaveBeenCalledTimes(requestsBeforePoll + 1))
		expect(screen.getByRole('status', { name: '수신 대기 중' })).toBeInTheDocument()

		sample.current = sampleRecordedNow({ orderId: 'ORD-1' })
		await act(async () => vi.advanceTimersByTimeAsync(5_000))

		expect(await screen.findByText(/"orderId": "ORD-1"/)).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '수신 대기 중' })).not.toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()
		const requestsAfterReceive = sample.requested.mock.calls.length

		await act(async () => vi.advanceTimersByTimeAsync(15_000))
		expect(sample.requested).toHaveBeenCalledTimes(requestsAfterReceive)
	})

	// 화면 캐시에는 PREVIOUS_SAMPLE이 남아 있는데 서버 샘플은 그 사이 바뀐 상황이다.
	// '대기 그만' 뒤에도 서버 대기가 요청을 받거나, 채팅 에이전트가 같은 노드를 테스트하면 이렇게 된다.
	it('대기를 시작하기 전에 기록된 샘플은 화면 캐시보다 새로워도 받은 것으로 보지 않는다', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		mockTokenStatus(true)
		const sample = mockSampleSource(PREVIOUS_SAMPLE)
		respondListening()
		renderSection(webhookNode)
		await screen.findByLabelText('테스트 출력')
		sample.current = sampleRecordedNow({ arrivedBeforeListen: true })
		await act(async () => vi.advanceTimersByTimeAsync(1_000))

		await user.click(getTestButton())
		await screen.findByRole('status', { name: '수신 대기 중' })
		const requestsBeforePoll = sample.requested.mock.calls.length
		await act(async () => vi.advanceTimersByTimeAsync(5_000))
		await waitFor(() => expect(sample.requested).toHaveBeenCalledTimes(requestsBeforePoll + 1))

		expect(screen.getByRole('status', { name: '수신 대기 중' })).toBeInTheDocument()

		sample.current = sampleRecordedNow({ orderId: 'ORD-2' })
		await act(async () => vi.advanceTimersByTimeAsync(5_000))

		expect(await screen.findByText(/"orderId": "ORD-2"/)).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '수신 대기 중' })).not.toBeInTheDocument()
	})

	it('5분 동안 받지 못하면 만료를 알리고 샘플 확인을 멈춘다', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		mockTokenStatus(true)
		const sample = mockSampleSource(null)
		respondListening()
		renderSection(webhookNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())
		await screen.findByRole('status', { name: '수신 대기 중' })
		await act(async () => vi.advanceTimersByTimeAsync(5 * 60_000 + 1_000))

		expect(await screen.findByText('5분 동안 요청을 받지 못했어요. 다시 테스트해 주세요.')).toBeInTheDocument()
		expect(screen.queryByRole('status', { name: '수신 대기 중' })).not.toBeInTheDocument()
		const requestsAfterExpiry = sample.requested.mock.calls.length

		await act(async () => vi.advanceTimersByTimeAsync(15_000))
		expect(sample.requested).toHaveBeenCalledTimes(requestsAfterExpiry)
	})

	it('대기 그만을 누르거나 패널을 닫으면 샘플 확인을 멈춘다', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true })
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
		mockTokenStatus(true)
		const sample = mockSampleSource(null)
		respondListening()
		const { unmount } = renderSection(webhookNode)
		await screen.findByText('아직 테스트하지 않았어요.')

		await user.click(getTestButton())
		await screen.findByRole('status', { name: '수신 대기 중' })
		await user.click(screen.getByRole('button', { name: '대기 그만' }))

		expect(screen.queryByRole('status', { name: '수신 대기 중' })).not.toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()
		const requestsAfterStop = sample.requested.mock.calls.length
		await act(async () => vi.advanceTimersByTimeAsync(15_000))
		expect(sample.requested).toHaveBeenCalledTimes(requestsAfterStop)

		await user.click(getTestButton())
		await screen.findByRole('status', { name: '수신 대기 중' })
		unmount()
		const requestsAfterUnmount = sample.requested.mock.calls.length
		await act(async () => vi.advanceTimersByTimeAsync(15_000))
		expect(sample.requested).toHaveBeenCalledTimes(requestsAfterUnmount)
	})

	it('서버가 수신 주소가 없다고 하면 안내하고 주소 칸을 만들기로 되돌린다', async () => {
		const user = userEvent.setup()
		const statusRequested = mockTokenStatus(true, false)
		observeTestRequests(() => apiError('WEBHOOK_TOKEN_NOT_ISSUED', 400, null, '수신 주소를 먼저 만들어 주세요.'))
		renderSection(webhookNode)
		await screen.findByText(/주소는 만들 때만 보여 줘요/)

		await user.click(getTestButton())

		expect(await screen.findByRole('alert')).toHaveTextContent('수신 주소를 먼저 만들어 주세요.')
		expect(await screen.findByRole('button', { name: '수신 주소 만들기' })).toBeInTheDocument()
		expect(statusRequested).toHaveBeenCalledTimes(2)
	})

	it('주소를 만드는 동안 시작된 발급 상태 조회가 늦게 끝나도 방금 만든 주소를 덮지 않는다', async () => {
		const user = userEvent.setup()
		mockTokenStatus(false)
		server.use(
			http.post(WEBHOOK_TOKEN_PATH, () =>
				okData({ token: 'tok-3', path: '/api/v1/hooks/tok-3', issuedAt: '2026-11-09T06:00:00Z' })
			)
		)
		const { queryClient } = renderSection(webhookNode)
		await screen.findByRole('button', { name: '수신 주소 만들기' })

		// 탭으로 돌아와 시작된 상태 재조회처럼, 발급보다 늦게 '미발급'을 돌려줄 조회를 붙잡아 둔다.
		let releaseStatus = () => {}
		const statusGate = new Promise<void>(resolve => {
			releaseStatus = resolve
		})
		server.use(
			http.get(WEBHOOK_TOKEN_PATH, async () => {
				await statusGate
				return okData({ issued: false, issuedAt: null })
			})
		)
		void queryClient.invalidateQueries({ queryKey: queryKeys.webhookTokens.status(WORKFLOW_ID) })

		await user.click(screen.getByRole('button', { name: '수신 주소 만들기' }))
		await screen.findByRole('textbox', { name: '수신 주소' })
		releaseStatus()
		// 붙잡았던 조회가 응답까지 끝난 뒤의 화면을 본다. 취소되지 않았다면 이 응답이 '미발급'으로 덮는다.
		await waitFor(() => expect(queryClient.isFetching({ queryKey: queryKeys.webhookTokens.status(WORKFLOW_ID) })).toBe(0))

		expect(screen.getByRole('textbox', { name: '수신 주소' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '수신 주소 만들기' })).not.toBeInTheDocument()
		expect(getTestButton()).toBeEnabled()
	})

	it('주소를 만들지 못하면 오류를 알리고 테스트는 계속 끈다', async () => {
		const user = userEvent.setup()
		mockTokenStatus(false)
		server.use(http.post(WEBHOOK_TOKEN_PATH, () => apiError('INTERNAL_SERVER_ERROR', 500)))
		renderSection(webhookNode)

		await user.click(await screen.findByRole('button', { name: '수신 주소 만들기' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('수신 주소를 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
		expect(screen.queryByRole('textbox', { name: '수신 주소' })).not.toBeInTheDocument()
		expect(getTestButton()).toBeDisabled()
	})

	it('발급 상태를 불러오지 못하면 알리고 다시 시도로 다시 불러온다', async () => {
		const user = userEvent.setup()
		let failsStatus = true
		server.use(
			http.get(WEBHOOK_TOKEN_PATH, () =>
				failsStatus ? apiError('INTERNAL_SERVER_ERROR', 500) : okData({ issued: false, issuedAt: null })
			)
		)
		renderSection(webhookNode)

		expect(await screen.findByText('수신 주소를 확인하지 못했어요.')).toBeInTheDocument()
		failsStatus = false
		await user.click(screen.getByRole('button', { name: '다시 시도' }))

		expect(await screen.findByRole('button', { name: '수신 주소 만들기' })).toBeInTheDocument()
		expect(screen.queryByText('수신 주소를 확인하지 못했어요.')).not.toBeInTheDocument()
	})

	it('주소를 복사하지 못하면 직접 복사하라고 알린다', async () => {
		const user = userEvent.setup()
		mockTokenStatus(false)
		server.use(
			http.post(WEBHOOK_TOKEN_PATH, () =>
				okData({ token: 'tok-4', path: '/api/v1/hooks/tok-4', issuedAt: '2026-11-09T06:00:00Z' })
			)
		)
		// userEvent.setup()이 넣은 clipboard stub의 쓰기를 권한 거부처럼 실패시킨다.
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
		renderSection(webhookNode)
		await user.click(await screen.findByRole('button', { name: '수신 주소 만들기' }))
		await screen.findByRole('textbox', { name: '수신 주소' })

		await user.click(screen.getByRole('button', { name: '복사' }))

		expect(await screen.findByText(/복사하지 못했어요. 주소를 직접 선택해 복사해 주세요./)).toBeInTheDocument()
		expect(screen.queryByText(/주소를 복사했어요/)).not.toBeInTheDocument()
	})
})
