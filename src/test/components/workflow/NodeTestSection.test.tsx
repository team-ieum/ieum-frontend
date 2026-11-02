import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import Modal from '@/components/common/Modal'
import NodeSettingsPanel from '@/components/workflow/settings/NodeSettingsPanel'
import NodeTestSection from '@/components/workflow/settings/NodeTestSection'
import { nodeCatalogEntriesFixture } from '@/mocks/fixtures/nodeCatalog'
import { NODE_SAMPLE_PATH, NODE_TEST_PATH } from '@/mocks/nodeTestHandlers'
import { server } from '@/mocks/server'
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

const renderSection = (node: WorkflowNodeDto, options: { nodes?: WorkflowNodeDto[]; onNodeOpen?: (id: string) => void } = {}) => {
	const onNodeOpen = options.onNodeOpen ?? vi.fn()
	const props = { workflowId: WORKFLOW_ID, entry: findEntry(node.event), nodes: options.nodes ?? [node], onNodeOpen }
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

	it('webhook.catch는 수신 대기 테스트가 준비 중이라 버튼을 끈다', async () => {
		renderSection({ id: 'hook-1', type: 'TRIGGER', event: 'webhook.catch', label: '웹훅', config: {} })

		expect(getTestButton()).toBeDisabled()
		expect(screen.getByText('웹훅 수신 테스트는 준비 중이에요.')).toBeInTheDocument()
		await screen.findByText('아직 테스트하지 않았어요.')
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
