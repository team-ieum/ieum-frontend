import type { EdgeProps } from '@xyflow/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AnimatedEdge from '@/components/workflow/AnimatedEdge'
import WorkflowChat from '@/components/workflow/WorkflowChat'
import { setReducedMotion } from '@/test/domEnvironment'

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	return {
		...actual,
		getBezierPath: () => ['M 0 0 C 20 0 20 40 40 40', 20, 20],
		EdgeToolbar: () => null,
		useReactFlow: () => ({ deleteElements: vi.fn() }),
	}
})

vi.mock('@/hooks/workflow/useWorkflowChat', () => ({
	useWorkflowChat: () => ({
		messages: [],
		input: '',
		setInput: vi.fn(),
		isTyping: true,
		handleSend: vi.fn(),
		handleKeyDown: vi.fn(),
		bodyRef: { current: null },
		credentials: [],
		selectedCredentialId: null,
		setSelectedCredentialId: vi.fn(),
		currentStage: null,
	}),
}))

const flowingEdgeProps = {
	id: 'edge-1',
	source: 'trigger',
	target: 'ai',
	sourceX: 0,
	sourceY: 0,
	targetX: 40,
	targetY: 40,
	sourcePosition: 'right',
	targetPosition: 'left',
	selected: false,
	data: { flowing: true },
} as unknown as EdgeProps

const renderFlowingEdge = () =>
	render(
		<svg>
			<AnimatedEdge {...flowingEdgeProps} />
		</svg>
	).container.querySelectorAll('path')[1]

const renderTypingDots = () => {
	render(<WorkflowChat workflowId='workflow-1' currentNodes={[]} currentEdges={[]} />)
	fireEvent.click(screen.getByRole('button', { name: '채팅 열기' }))
	return [...document.querySelectorAll<HTMLElement>('[data-typing-dot]')]
}

describe('워크플로우 반복 애니메이션의 reduced-motion', () => {
	it('실행 중 연결선은 기본 환경에서 대시 흐름을 시작한다', () => {
		expect(renderFlowingEdge()).toHaveAttribute('stroke-dashoffset', '28')
	})

	it('reduced-motion에서는 실행 중 연결선의 대시를 정적으로 표시한다', () => {
		setReducedMotion(true)

		expect(renderFlowingEdge()).toHaveAttribute('stroke-dashoffset', '0')
	})

	it('reduced-motion에서는 응답 대기 점을 반복 이동 없이 정적으로 표시한다', () => {
		setReducedMotion(true)

		const dots = renderTypingDots()

		expect(dots).toHaveLength(3)
		for (const dot of dots) {
			expect(dot).toHaveStyle({ opacity: '0.6' })
			expect(dot.style.transform).toBe('')
		}
	})

	it('기본 환경에서는 응답 대기 점이 반복 애니메이션 첫 프레임에서 시작한다', () => {
		const dots = renderTypingDots()

		expect(dots).toHaveLength(3)
		expect(dots[0]).toHaveStyle({ opacity: '0.3' })
	})
})
