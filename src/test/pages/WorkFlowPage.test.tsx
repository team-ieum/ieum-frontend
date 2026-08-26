import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkFlowPage from '@/pages/WorkFlowPage'
import { useExecutionStore } from '@/stores/useExecutionStore'
import { getWorkflowDraftKey } from '@/utils/workflow/workflowDraftStorage'

const mocks = vi.hoisted(() => ({
	execute: vi.fn(),
	toggle: vi.fn(),
	openModal: vi.fn(),
}))

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	type CanvasNode = {
		id: string
		position: { x: number; y: number }
		data: {
			technicalMode: boolean
			description?: string
			method?: string
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
						<span>{node.data.technicalMode ? (node.data.method ?? '정보 없음') : node.data.description}</span>
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
	useWorkflowQuery: () => ({
		data: {
			data: {
				id: 'workflow-1',
				name: '고객 문의 분류',
				active: true,
				version: 1,
				nodes: [
					{
						id: 'trigger',
						type: 'TRIGGER',
						label: '문의가 도착하면',
						description: '새 문의가 들어오면 시작해요',
						config: { method: 'POST', url: '/hooks/inquiry' },
					},
					{
						id: 'ai',
						type: 'AI',
						label: '문의 분류하기',
						config: { model: 'server-unknown-model' },
					},
					{ id: 'action', type: 'HTTP', label: '담당자에게 알리기', config: {} },
				],
				edges: [
					{ source: 'trigger', target: 'ai', conditionType: null },
					{ source: 'ai', target: 'missing-node', conditionType: null },
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

const renderPage = () =>
	render(
		<MemoryRouter initialEntries={['/workflow/workflow-1']}>
			<Routes>
				<Route path='/workflow/:workflowId' element={<WorkFlowPage />} />
			</Routes>
		</MemoryRouter>
	)

describe('WorkFlowPage', () => {
	beforeEach(() => {
		localStorage.clear()
		useExecutionStore.getState().reset()
	})

	it('조회한 노드와 연결선을 편집 가능한 캔버스로 표시한다', () => {
		renderPage()

		expect(screen.getByText('새 문의가 들어오면 시작해요')).toBeInTheDocument()
		expect(screen.getByText('server-unknown-model')).toBeInTheDocument()
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
		expect(screen.getByText('POST')).toBeInTheDocument()
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
})
