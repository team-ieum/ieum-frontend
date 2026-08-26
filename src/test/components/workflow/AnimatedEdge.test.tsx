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

const createProps = (selected: boolean) =>
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
		data: {},
	}) as unknown as EdgeProps

describe('AnimatedEdge', () => {
	it('선택한 연결선에 삭제 버튼을 표시하고 삭제 요청을 전달한다', () => {
		render(
			<svg>
				<AnimatedEdge {...createProps(true)} />
			</svg>
		)

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
