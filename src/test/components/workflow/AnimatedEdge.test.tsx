import type { EdgeProps } from '@xyflow/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AnimatedEdge from '@/components/workflow/AnimatedEdge'

const mocks = vi.hoisted(() => ({ deleteElements: vi.fn() }))

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	return {
		...actual,
		getBezierPath: () => ['M 0 0 C 20 0 20 40 40 40', 20, 20],
		EdgeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) =>
			isVisible ? <div>{children}</div> : null,
		useReactFlow: () => ({ deleteElements: mocks.deleteElements }),
	}
})

const createProps = (selected: boolean, flowing = false) =>
	({
		id: 'edge-1',
		source: 'trigger',
		target: 'ai',
		sourceX: 0,
		sourceY: 0,
		targetX: 40,
		targetY: 40,
		sourcePosition: 'right',
		targetPosition: 'left',
		selected,
		markerEnd: 'marker',
		style: { strokeWidth: 1.5 },
		data: { flowing },
	}) as unknown as EdgeProps

describe('AnimatedEdge', () => {
	it('기본 연결선은 저채도 중성색으로 표시한다', () => {
		const { container } = render(
			<svg>
				<AnimatedEdge {...createProps(false)} />
			</svg>
		)

		expect(container.querySelector('.react-flow__edge-path')).toHaveStyle({
			stroke: '#a8b0ba',
			strokeWidth: '1.5',
		})
		expect(container.querySelectorAll('path')).toHaveLength(1)
	})

	it('실행 중인 연결선에만 강조색 흐름을 덧그린다', () => {
		const { container } = render(
			<svg>
				<AnimatedEdge {...createProps(false, true)} />
			</svg>
		)

		const paths = container.querySelectorAll('path')
		expect(paths).toHaveLength(2)
		expect(paths[1]).toHaveStyle({ stroke: '#007ba7', strokeWidth: '2.5' })
	})

	it('선택한 연결선에 삭제 버튼을 표시하고 삭제 요청을 전달한다', () => {
		const { container } = render(
			<svg>
				<AnimatedEdge {...createProps(true)} />
			</svg>
		)

		expect(container.querySelector('.react-flow__edge-path')).toHaveStyle({ strokeWidth: '2.5' })
		fireEvent.click(screen.getByRole('button', { name: '연결 삭제' }))

		expect(mocks.deleteElements).toHaveBeenCalledWith({ edges: [{ id: 'edge-1' }] })
	})

	it('선택하지 않은 연결선에는 삭제 버튼을 표시하지 않는다', () => {
		render(
			<svg>
				<AnimatedEdge {...createProps(false)} />
			</svg>
		)

		expect(screen.queryByRole('button', { name: '연결 삭제' })).not.toBeInTheDocument()
	})
})
