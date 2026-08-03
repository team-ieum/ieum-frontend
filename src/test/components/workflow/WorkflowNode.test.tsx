import type { NodeProps } from '@xyflow/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkflowNode from '@/components/workflow/WorkflowNode'
import type { WorkflowNodeType } from '@/types/workflow'

vi.mock('@xyflow/react', async () => {
	const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
	return { ...actual, Handle: () => <span data-testid='handle' /> }
})

const createProps = (technicalMode: boolean) =>
	({
		id: 'ai-node',
		data: {
			nodeType: 'AI',
			role: 'ai',
			typeLabel: 'AI 작업',
			step: 2,
			title: '문의 유형 나누기',
			description: 'AI가 문의를 분류해요',
			method: 'POST',
			url: '/ai/classify-inquiry',
			modelId: 'gemini-2.5-flash',
			modelName: 'Gemini 2.5 Flash',
			status: 'idle',
			technicalMode,
			hasIncoming: true,
			hasOutgoing: true,
		},
		selected: false,
	}) as NodeProps<WorkflowNodeType>

describe('WorkflowNode', () => {
	it('일반 모드에서 설명과 읽기 전용 모델 정보를 표시한다', () => {
		render(<WorkflowNode {...createProps(false)} />)

		expect(screen.getByText('AI가 문의를 분류해요')).toBeInTheDocument()
		expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument()
		expect(screen.getByLabelText('준비')).toBeInTheDocument()
		expect(screen.getAllByTestId('handle')).toHaveLength(2)
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})

	it('기술 정보 모드에서 실제 Method와 URL을 표시한다', () => {
		render(<WorkflowNode {...createProps(true)} />)

		expect(screen.queryByText('AI가 문의를 분류해요')).not.toBeInTheDocument()
		expect(screen.getByText('Method')).toBeInTheDocument()
		expect(screen.getByText('POST')).toBeInTheDocument()
		expect(screen.getByText('/ai/classify-inquiry')).toBeInTheDocument()
	})

	it('기술 정보가 없으면 명시적인 대체 문구를 표시한다', () => {
		const props = createProps(true)
		props.data.method = undefined
		props.data.url = undefined
		render(<WorkflowNode {...props} />)

		expect(screen.getAllByText('정보 없음')).toHaveLength(2)
	})
})
