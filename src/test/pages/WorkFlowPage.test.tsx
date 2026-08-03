import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkFlowPage from '@/pages/WorkFlowPage'
import { useExecutionStore } from '@/stores/useExecutionStore'

const mocks = vi.hoisted(() => ({
	execute: vi.fn(),
	toggle: vi.fn(),
	openModal: vi.fn(),
}))

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	type CanvasNode = {
		id: string
		data: { technicalMode: boolean; description?: string; method?: string; modelName?: string; status: string }
	}
	return {
		...actual,
		ReactFlow: ({ nodes, edges }: { nodes: CanvasNode[]; edges: unknown[] }) => (
			<div data-testid='workflow-canvas'>
				<span data-testid='edge-count'>{edges.length}</span>
				{nodes.map(node => (
					<div key={node.id}>
						<span data-testid={`status-${node.id}`}>{node.data.status}</span>
						<span>{node.data.technicalMode ? (node.data.method ?? '정보 없음') : node.data.description}</span>
						{node.data.modelName ? <span>{node.data.modelName}</span> : null}
					</div>
				))}
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
				],
				edges: [{ source: 'trigger', target: 'ai', conditionType: null }],
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
	default: ({ onCanvasUpdate }: { onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void }) => (
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
		useExecutionStore.getState().reset()
	})

	it('조회한 노드와 연결선을 표시하고 Provider에 없는 모델 ID를 유지한다', () => {
		renderPage()

		expect(screen.getByText('새 문의가 들어오면 시작해요')).toBeInTheDocument()
		expect(screen.getByText('server-unknown-model')).toBeInTheDocument()
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

	it('AI 채팅이 반환한 캔버스도 같은 변환 흐름으로 갱신한다', () => {
		renderPage()
		fireEvent.click(screen.getByRole('button', { name: 'AI 캔버스 반영' }))

		expect(screen.getByText('새 흐름이에요')).toBeInTheDocument()
		expect(screen.queryByText('새 문의가 들어오면 시작해요')).not.toBeInTheDocument()
		expect(screen.getByTestId('edge-count')).toHaveTextContent('0')
	})

	it('SSE 실행 실패 상태를 컬러 블록 오류 상태로 반영한다', () => {
		renderPage()

		act(() => useExecutionStore.getState().setNodeStatus('ai', 'failed'))

		expect(screen.getByTestId('status-ai')).toHaveTextContent('error')
	})
})
