import type { NodeProps } from '@xyflow/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import type { WorkflowNodeType } from '@/types/workflow'

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	return {
		...actual,
		Handle: ({ type }: { type: string }) => <span data-testid={`handle-${type}`} />,
	}
})

const createProps = (technicalMode: boolean, role: 'trigger' | 'ai' = 'ai') =>
	({
		id: 'ai-node',
		data: {
			nodeType: role === 'trigger' ? 'TRIGGER' : 'AI',
			role,
			typeLabel: role === 'trigger' ? '시작 조건' : 'AI 작업',
			step: 2,
			title: '문의 유형 나누기',
			description: 'AI가 문의를 분류해요',
			technicalDetails: [
				{ label: '제공자', value: 'GEMINI' },
				{ label: '모델 ID', value: 'gemini-2.5-flash' },
			],
			modelId: 'gemini-2.5-flash',
			modelName: 'Gemini 2.5 Flash',
			status: 'idle',
			technicalMode,
		},
		selected: false,
	}) as unknown as NodeProps<WorkflowNodeType>

describe('WorkflowNode', () => {
	it('일반 모드에서 설명과 읽기 전용 모델 정보를 표시한다', () => {
		const { container } = render(<WorkflowNode {...createProps(false)} />)

		expect(screen.getByText('AI가 문의를 분류해요')).toBeInTheDocument()
		expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument()
		expect(screen.getByRole('img', { name: '준비' })).toBeInTheDocument()
		expect(screen.getByText('2')).toHaveAttribute('aria-hidden', 'true')
		expect(screen.getByText('2단계')).toHaveClass('sr-only')
		expect(screen.getByTestId('handle-target')).toBeInTheDocument()
		expect(screen.getByTestId('handle-source')).toBeInTheDocument()
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
		expect(container.querySelector('article')?.style.transform).toBe('')
	})

	it('시작 조건에는 출력 핸들만 표시한다', () => {
		render(<WorkflowNode {...createProps(false, 'trigger')} />)

		expect(screen.queryByTestId('handle-target')).not.toBeInTheDocument()
		expect(screen.getByTestId('handle-source')).toBeInTheDocument()
	})

	it('기술 정보 모드에서 허용된 타입별 상세 정보만 표시한다', () => {
		render(<WorkflowNode {...createProps(true)} />)

		expect(screen.queryByText('AI가 문의를 분류해요')).not.toBeInTheDocument()
		expect(screen.getByText('제공자')).toBeInTheDocument()
		expect(screen.getByText('GEMINI')).toBeInTheDocument()
		expect(screen.getByText('모델 ID')).toBeInTheDocument()
		expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument()
		expect(screen.queryByText('Gemini 2.5 Flash')).not.toBeInTheDocument()
	})

	it('기술 정보가 없으면 명시적인 대체 문구를 표시한다', () => {
		const props = createProps(true)
		props.data.technicalDetails = []
		render(<WorkflowNode {...props} />)

		expect(screen.getByText('표시할 기술 정보가 없어요')).toBeInTheDocument()
	})
})
