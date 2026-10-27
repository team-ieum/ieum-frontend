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
			isOutsideCatalog: false,
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

	it('기술 정보에 title이 있으면 마우스를 올렸을 때 원문을 보여 준다', () => {
		const props = createProps(true, 'trigger')
		props.data.technicalDetails = [{ label: '주기', value: '오전 09:00, 월요일에만', title: '0 9 * * 1' }]
		render(<WorkflowNode {...props} />)

		expect(screen.getByText('오전 09:00, 월요일에만')).toHaveAttribute('title', '0 9 * * 1')
	})

	it('brand를 아는 ACTION 노드는 브랜드 tint 칸에 로고를 표시한다', () => {
		const props = createProps(false)
		Object.assign(props.data, { nodeType: 'ACTION', role: 'action', brand: 'slack', typeLabel: 'Slack' })
		render(<WorkflowNode {...props} />)

		const logo = screen.getByRole('img', { hidden: true, name: 'Slack 로고' })
		expect(screen.getByText('Slack')).toBeInTheDocument()
		expect(logo.parentElement?.style.getPropertyValue('--brand-tint')).toBe('#e8f5f0')
		// 헤더 라벨과 중복되지 않게 로고는 보조기기에서 숨긴다.
		expect(logo.parentElement).toHaveAttribute('aria-hidden', 'true')
		expect(screen.queryByRole('img', { name: 'Slack 로고' })).not.toBeInTheDocument()
	})

	it('brand가 없는 ACTION·APPROVAL 노드는 기본 아이콘과 타입 라벨을 표시한다', () => {
		const actionProps = createProps(false)
		Object.assign(actionProps.data, { nodeType: 'ACTION', role: 'action', typeLabel: '앱 작업' })
		const { container: actionContainer, unmount } = render(<WorkflowNode {...actionProps} />)

		expect(screen.getByText('앱 작업')).toBeInTheDocument()
		expect(actionContainer.querySelector('header svg.lucide-blocks')).not.toBeNull()
		expect(screen.queryByRole('img', { hidden: true, name: /로고/ })).not.toBeInTheDocument()
		unmount()

		const approvalProps = createProps(false)
		Object.assign(approvalProps.data, { nodeType: 'APPROVAL', role: 'action', typeLabel: '승인 요청' })
		const { container: approvalContainer } = render(<WorkflowNode {...approvalProps} />)

		expect(screen.getByText('승인 요청')).toBeInTheDocument()
		expect(approvalContainer.querySelector('header svg.lucide-user-check')).not.toBeNull()
	})

	it('카탈로그 밖 노드에만 읽기 전용 칩을 일반·기술 정보 모드 모두 표시한다', () => {
		const { unmount } = render(<WorkflowNode {...createProps(false)} />)
		expect(screen.queryByText('지원하지 않는 작업 · 읽기 전용')).not.toBeInTheDocument()
		unmount()

		for (const technicalMode of [false, true]) {
			const props = createProps(technicalMode)
			props.data.isOutsideCatalog = true
			const { unmount: unmountOutside } = render(<WorkflowNode {...props} />)
			expect(screen.getByText('지원하지 않는 작업 · 읽기 전용')).toBeInTheDocument()
			unmountOutside()
		}
	})

	it('기술 정보가 없으면 명시적인 대체 문구를 표시한다', () => {
		const props = createProps(true)
		props.data.technicalDetails = []
		render(<WorkflowNode {...props} />)

		expect(screen.getByText('표시할 기술 정보가 없어요')).toBeInTheDocument()
	})
})
