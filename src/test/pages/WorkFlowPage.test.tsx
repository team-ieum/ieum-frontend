import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkFlowPage from '@/pages/WorkFlowPage'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { getWorkflowDraftKey } from '@/utils/workflow/workflowDraftStorage'

const mocks = vi.hoisted(() => ({
	execute: vi.fn(),
	toggle: vi.fn(),
	openModal: vi.fn(),
	workflowOneActive: true,
	workflowTwoActive: false,
}))

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	type CanvasNode = {
		id: string
		position: { x: number; y: number }
		data: {
			technicalMode: boolean
			description?: string
			technicalDetails: { label: string; value: string }[]
			modelName?: string
			status: string
		}
	}
	type CanvasEdge = { id: string; source: string; target: string }
	type ReactFlowMockProps = {
		nodes: CanvasNode[]
		edges: CanvasEdge[]
		nodesDraggable?: boolean
		nodesConnectable?: boolean
		edgesReconnectable?: boolean
		elementsSelectable?: boolean
		onNodeDragStop?: (event: never, node: CanvasNode, nodes: CanvasNode[]) => void
		onConnect?: (connection: { source: string; target: string; sourceHandle: null; targetHandle: null }) => void
		onReconnect?: (
			edge: CanvasEdge,
			connection: { source: string; target: string; sourceHandle: null; targetHandle: null }
		) => void
		onEdgesChange?: (changes: { id: string; type: 'remove' }[]) => void
	}

	return {
		...actual,
		ReactFlow: ({
			nodes,
			edges,
			nodesDraggable,
			nodesConnectable,
			edgesReconnectable,
			elementsSelectable,
			onNodeDragStop,
			onConnect,
			onReconnect,
			onEdgesChange,
		}: ReactFlowMockProps) => (
			<div
				data-testid='workflow-canvas'
				data-nodes-draggable={nodesDraggable}
				data-nodes-connectable={nodesConnectable}
				data-edges-reconnectable={edgesReconnectable}
				data-elements-selectable={elementsSelectable}
			>
				<span data-testid='edge-count'>{edges.length}</span>
				{nodes.map(node => (
					<div key={node.id}>
						<span data-testid={`status-${node.id}`}>{node.data.status}</span>
						{node.data.technicalMode ? (
							node.data.technicalDetails.length > 0 ? (
								node.data.technicalDetails.map(detail => (
									<span key={detail.label}>{`${detail.label}: ${detail.value}`}</span>
								))
							) : (
								<span>표시할 기술 정보가 없어요</span>
							)
						) : (
							<span>{node.data.description}</span>
						)}
						{node.data.modelName ? <span>{node.data.modelName}</span> : null}
					</div>
				))}
				<button
					type='button'
					onClick={() => {
						const node = nodes[0]
						onNodeDragStop?.({} as never, { ...node, position: { x: 240, y: 180 } }, nodes)
					}}
				>
					노드 이동
				</button>
				<button
					type='button'
					onClick={() => onConnect?.({ source: 'ai', target: 'action', sourceHandle: null, targetHandle: null })}
				>
					연결 추가
				</button>
				<button
					type='button'
					onClick={() => {
						const edge = edges[0]
						if (edge)
							onReconnect?.(edge, { source: 'trigger', target: 'action', sourceHandle: null, targetHandle: null })
					}}
				>
					연결 재연결
				</button>
				<button
					type='button'
					onClick={() => {
						const edge = edges[0]
						if (edge) onEdgesChange?.([{ id: edge.id, type: 'remove' }])
					}}
				>
					연결 제거
				</button>
			</div>
		),
		Background: () => null,
		Controls: () => null,
		MiniMap: () => null,
	}
})

vi.mock('@/hooks/workflow/queries/useWorkflowQuery', () => ({
	useWorkflowQuery: (workflowId: string) => ({
		data: {
			data:
				workflowId === 'workflow-2'
					? {
							id: 'workflow-2',
							name: '두 번째 워크플로우',
							active: mocks.workflowTwoActive,
							version: 1,
							nodes: [{ id: 'second', type: 'AI', label: '두 번째 노드', config: {} }],
							edges: [],
						}
					: {
							id: 'workflow-1',
							name: '고객 문의 분류',
							active: mocks.workflowOneActive,
							version: 1,
							nodes: [
								{
									id: 'trigger',
									type: 'TRIGGER',
									label: '문의가 도착하면',
									description: '새 문의가 들어오면 시작해요',
									config: { triggerType: 'MANUAL', brand: 'webhook' },
								},
								{
									id: 'ai',
									type: 'AI',
									label: '문의 분류하기',
									config: {
										llmProvider: 'GEMINI',
										model: 'server-unknown-model',
										credentialId: 'credential-secret',
										prompt: 'private prompt',
									},
								},
								{
									id: 'action',
									type: 'HTTP',
									label: '담당자에게 알리기',
									config: { method: 'POST', url: 'https://example.com/notify' },
								},
								{
									id: 'invalid-position',
									type: 'AI',
									label: '잘못된 좌표',
									position: { x: Number.NaN, y: 0 },
									config: {},
								},
							],
							edges: [
								{ source: 'trigger', target: 'ai', conditionType: null },
								{ source: 'ai', target: 'missing-node', conditionType: null },
								{ source: 'ai', target: 'invalid-position', conditionType: null },
							],
						},
		},
	}),
}))

vi.mock('@/hooks/aiCredentials/queries/useProvidersQuery', () => ({
	useProvidersQuery: () => ({ data: undefined, isError: true }),
}))

vi.mock('@/hooks/workflow/mutations/useToggleWorkflowMutation', () => ({
	useToggleWorkflowMutation: () => ({ mutateAsync: mocks.toggle }),
}))

vi.mock('@/hooks/workflow/useWorkflowExecution', () => ({
	useWorkflowExecution: () => ({ execute: mocks.execute, isExecuting: false }),
}))

vi.mock('@/stores/useModalStore', () => ({
	useModalStore: (selector: (state: { open: typeof mocks.openModal }) => unknown) => selector({ open: mocks.openModal }),
}))

vi.mock('@/components/workflow/WorkflowChat', () => ({
	default: ({
		currentNodes,
		currentEdges,
		onCanvasUpdate,
	}: {
		currentNodes: { id: string; position?: { x: number; y: number } }[]
		currentEdges: unknown[]
		onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void
	}) => (
		<div>
			<span data-testid='chat-edge-count'>{currentEdges.length}</span>
			<span data-testid='chat-trigger-position'>
				{JSON.stringify(currentNodes.find(node => node.id === 'trigger')?.position)}
			</span>
			<button
				type='button'
				onClick={() =>
					onCanvasUpdate?.(
						[{ id: 'ai-updated', type: 'AI', label: 'AI가 만든 노드', description: '새 흐름이에요', config: {} }],
						[]
					)
				}
			>
				AI 캔버스 반영
			</button>
		</div>
	),
}))

const renderPage = (options?: { reactStrictMode?: boolean }) =>
	render(
		<MemoryRouter initialEntries={['/workflow/workflow-1']}>
			<Link to='/workflow/workflow-2'>두 번째 워크플로우로 이동</Link>
			<Routes>
				<Route path='/workflow/:workflowId' element={<WorkFlowPage />} />
			</Routes>
		</MemoryRouter>,
		options
	)

const toggleActive = () => {
	const toggle = screen.getByRole('switch', { name: /워크플로우 (활성화|비활성화)/ })
	fireEvent.pointerDown(toggle, { clientX: 0 })
	fireEvent.pointerUp(toggle, { clientX: 0 })
}

const createDeferredToggle = () => {
	let resolve!: () => void
	let reject!: (reason: Error) => void
	const promise = new Promise<void>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})
	return { promise, resolve, reject }
}

describe('WorkFlowPage', () => {
	beforeEach(() => {
		localStorage.clear()
		useExecutionStore.getState().reset()
		mocks.toggle.mockReset()
		mocks.toggle.mockResolvedValue(undefined)
		mocks.openModal.mockReset()
		mocks.workflowOneActive = true
		mocks.workflowTwoActive = false
	})

	it('조회한 노드와 연결선을 편집 가능한 캔버스로 표시한다', () => {
		renderPage()

		expect(screen.getByText('새 문의가 들어오면 시작해요')).toBeInTheDocument()
		expect(screen.getByText('server-unknown-model')).toBeInTheDocument()
		expect(screen.queryByTestId('status-invalid-position')).not.toBeInTheDocument()
		expect(screen.getByTestId('workflow-canvas')).toHaveAttribute('data-nodes-draggable', 'true')
		expect(screen.getByTestId('workflow-canvas')).toHaveAttribute('data-nodes-connectable', 'true')
		expect(screen.getByTestId('workflow-canvas')).toHaveAttribute('data-edges-reconnectable', 'true')
		expect(screen.getByTestId('workflow-canvas')).toHaveAttribute('data-elements-selectable', 'true')
	})

	it('존재하지 않는 노드를 참조하는 연결선을 제외한다', () => {
		renderPage()

		expect(screen.getByTestId('edge-count')).toHaveTextContent('1')
	})

	it('툴바 스위치로 모든 노드를 기술 정보 모드로 전환한다', () => {
		renderPage()

		const technicalSwitch = screen.getByRole('switch', { name: '기술 정보' })
		expect(technicalSwitch).toHaveAttribute('aria-checked', 'false')
		fireEvent.click(technicalSwitch)

		expect(technicalSwitch).toHaveAttribute('aria-checked', 'true')
		expect(screen.getByText('실행 방식: 수동 실행 (MANUAL)')).toBeInTheDocument()
		expect(screen.getByText('Method: POST')).toBeInTheDocument()
		expect(screen.getByText('제공자: GEMINI')).toBeInTheDocument()
		expect(screen.queryByText('credential-secret')).not.toBeInTheDocument()
		expect(screen.queryByText('private prompt')).not.toBeInTheDocument()
		expect(screen.queryByText('새 문의가 들어오면 시작해요')).not.toBeInTheDocument()
	})

	it('AI 채팅이 반환한 캔버스를 로컬 초안과 같은 변환 흐름으로 갱신한다', () => {
		renderPage()
		fireEvent.click(screen.getByRole('button', { name: 'AI 캔버스 반영' }))

		expect(screen.getByText('새 흐름이에요')).toBeInTheDocument()
		expect(screen.queryByText('새 문의가 들어오면 시작해요')).not.toBeInTheDocument()
		expect(screen.getByTestId('edge-count')).toHaveTextContent('0')
		expect(screen.getByRole('status', { name: '저장되지 않은 변경사항' })).toBeInTheDocument()
	})

	it('SSE 실행 실패 상태를 컬러 블록 오류 상태로 반영한다', () => {
		renderPage()

		act(() => useExecutionStore.getState().setNodeStatus('ai', 'failed'))

		expect(screen.getByTestId('status-ai')).toHaveTextContent('error')
	})

	it('제목 변경을 로컬 초안에 기록하고 원본으로 되돌리면 초안을 제거한다', () => {
		renderPage()
		const title = screen.getByRole('textbox', { name: '워크플로우 제목' })

		fireEvent.change(title, { target: { value: '수정된 문의 분류' } })

		expect(screen.getByRole('status', { name: '저장되지 않은 변경사항' })).toBeInTheDocument()
		expect(screen.getByText('브라우저에 임시 보관됨')).toBeInTheDocument()
		expect(JSON.parse(localStorage.getItem(getWorkflowDraftKey('workflow-1')) ?? '{}')).toMatchObject({
			title: '수정된 문의 분류',
			workflowVersion: 1,
		})

		fireEvent.change(title, { target: { value: '고객 문의 분류' } })
		expect(screen.queryByRole('status', { name: '저장되지 않은 변경사항' })).not.toBeInTheDocument()
		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
	})

	it('노드 위치와 연결 생성·재연결·삭제를 초안과 채팅 입력에 반영한다', () => {
		renderPage()

		fireEvent.click(screen.getByRole('button', { name: '노드 이동' }))
		expect(screen.getByTestId('chat-trigger-position')).toHaveTextContent('{"x":240,"y":180}')

		fireEvent.click(screen.getByRole('button', { name: '연결 추가' }))
		expect(screen.getByTestId('edge-count')).toHaveTextContent('2')
		expect(screen.getByTestId('chat-edge-count')).toHaveTextContent('2')

		fireEvent.click(screen.getByRole('button', { name: '연결 재연결' }))
		const reconnected = JSON.parse(localStorage.getItem(getWorkflowDraftKey('workflow-1')) ?? '{}')
		expect(reconnected.edges).toContainEqual({ source: 'trigger', target: 'action', conditionType: null })

		fireEvent.click(screen.getByRole('button', { name: '연결 제거' }))
		expect(screen.getByTestId('edge-count')).toHaveTextContent('1')
		expect(screen.getByTestId('chat-edge-count')).toHaveTextContent('1')
	})

	it('같은 서버 버전의 로컬 초안을 새로고침 진입 시 복원한다', () => {
		localStorage.setItem(
			getWorkflowDraftKey('workflow-1'),
			JSON.stringify({
				schemaVersion: 1,
				workflowVersion: 1,
				updatedAt: new Date().toISOString(),
				title: '복원된 문의 분류',
				nodes: [
					{ id: 'trigger', type: 'TRIGGER', label: '문의가 도착하면', position: { x: 90, y: 120 }, config: {} },
					{ id: 'action', type: 'HTTP', label: '담당자에게 알리기', config: {} },
				],
				edges: [{ source: 'trigger', target: 'action', conditionType: null }],
			})
		)

		renderPage()

		expect(screen.getByRole('textbox', { name: '워크플로우 제목' })).toHaveValue('복원된 문의 분류')
		expect(screen.getByRole('status', { name: '저장되지 않은 변경사항' })).toBeInTheDocument()
		expect(screen.getByText('브라우저에 임시 보관됨')).toBeInTheDocument()
		expect(screen.getByTestId('edge-count')).toHaveTextContent('1')
	})

	it('서버 원본과 같은 초안은 페이지가 마운트된 뒤 정리한다', () => {
		localStorage.setItem(
			getWorkflowDraftKey('workflow-1'),
			JSON.stringify({
				schemaVersion: 1,
				workflowVersion: 1,
				updatedAt: new Date().toISOString(),
				title: '고객 문의 분류',
				nodes: [
					{
						id: 'trigger',
						type: 'TRIGGER',
						label: '문의가 도착하면',
						description: '새 문의가 들어오면 시작해요',
						config: { triggerType: 'MANUAL', brand: 'webhook' },
					},
					{
						id: 'ai',
						type: 'AI',
						label: '문의 분류하기',
						config: {
							llmProvider: 'GEMINI',
							model: 'server-unknown-model',
							credentialId: 'credential-secret',
							prompt: 'private prompt',
						},
					},
					{
						id: 'action',
						type: 'HTTP',
						label: '담당자에게 알리기',
						config: { method: 'POST', url: 'https://example.com/notify' },
					},
				],
				edges: [{ source: 'trigger', target: 'ai', conditionType: null }],
			})
		)

		renderPage()

		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
		expect(screen.queryByRole('status', { name: '저장되지 않은 변경사항' })).not.toBeInTheDocument()
	})

	it('손상된 초안은 페이지가 마운트된 뒤 정리하고 서버 원본을 사용한다', () => {
		localStorage.setItem(getWorkflowDraftKey('workflow-1'), '{bad json')

		renderPage()

		expect(localStorage.getItem(getWorkflowDraftKey('workflow-1'))).toBeNull()
		expect(screen.getByText('새 문의가 들어오면 시작해요')).toBeInTheDocument()
	})

	it('활성 상태 변경을 즉시 표시하고 성공 시 서버 상태로 동기화한다', async () => {
		const pending = createDeferredToggle()
		mocks.toggle.mockReturnValue(pending.promise)
		renderPage()

		toggleActive()
		expect(screen.getByRole('switch', { name: '워크플로우 활성화' })).toHaveAttribute('aria-checked', 'false')

		mocks.workflowOneActive = false
		await act(async () => pending.resolve())
		expect(screen.getByRole('switch', { name: '워크플로우 활성화' })).toHaveAttribute('aria-checked', 'false')
		expect(mocks.openModal).not.toHaveBeenCalled()
	})

	it('활성 상태 변경 실패 시 서버 상태로 복구하고 오류를 알린다', async () => {
		const pending = createDeferredToggle()
		mocks.toggle.mockReturnValue(pending.promise)
		renderPage()

		toggleActive()
		expect(screen.getByRole('switch', { name: '워크플로우 활성화' })).toHaveAttribute('aria-checked', 'false')

		await act(async () => pending.reject(new Error('상태 변경 실패')))
		await waitFor(() =>
			expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toHaveAttribute('aria-checked', 'true')
		)
		expect(mocks.openModal).toHaveBeenCalledWith('오류', '상태 변경에 실패했어요. 다시 시도해주세요.')
	})

	it('토글 요청 중 페이지를 언마운트하면 늦은 실패가 오류 모달을 열지 않는다', async () => {
		const pending = createDeferredToggle()
		mocks.toggle.mockReturnValue(pending.promise)
		const { unmount } = renderPage()

		toggleActive()
		unmount()

		await act(async () => pending.reject(new Error('언마운트 후 실패')))
		expect(mocks.openModal).not.toHaveBeenCalled()
	})

	it('StrictMode의 effect 재실행 후에도 현재 workflow 토글 실패를 복구하고 알린다', async () => {
		const pending = createDeferredToggle()
		mocks.toggle.mockReturnValue(pending.promise)
		renderPage({ reactStrictMode: true })

		toggleActive()
		expect(screen.getByRole('switch', { name: '워크플로우 활성화' })).toHaveAttribute('aria-checked', 'false')

		await act(async () => pending.reject(new Error('상태 변경 실패')))
		await waitFor(() =>
			expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toHaveAttribute('aria-checked', 'true')
		)
		expect(mocks.openModal).toHaveBeenCalledWith('오류', '상태 변경에 실패했어요. 다시 시도해주세요.')
	})

	it('이전 workflow의 늦은 토글 실패가 새 workflow 상태와 모달을 바꾸지 않는다', async () => {
		const first = createDeferredToggle()
		const second = createDeferredToggle()
		mocks.toggle.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		renderPage()

		toggleActive()
		fireEvent.click(screen.getByRole('link', { name: '두 번째 워크플로우로 이동' }))
		expect(screen.getByRole('textbox', { name: '워크플로우 제목' })).toHaveValue('두 번째 워크플로우')
		expect(screen.getByRole('switch', { name: '워크플로우 활성화' })).toHaveAttribute('aria-checked', 'false')

		toggleActive()
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toHaveAttribute('aria-checked', 'true')

		await act(async () => first.reject(new Error('이전 workflow 실패')))
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toHaveAttribute('aria-checked', 'true')
		expect(mocks.openModal).not.toHaveBeenCalled()

		mocks.workflowTwoActive = true
		await act(async () => second.resolve())
		expect(screen.getByRole('switch', { name: '워크플로우 비활성화' })).toHaveAttribute('aria-checked', 'true')
	})
})
