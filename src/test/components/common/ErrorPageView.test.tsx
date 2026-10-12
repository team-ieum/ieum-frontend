import { fireEvent, render, screen } from '@testing-library/react'
import { FileQuestion } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import ErrorPageView from '@/components/common/ErrorPageView'

describe('ErrorPageView', () => {
	it('제목과 설명을 section의 이름과 설명으로 연결해 표시한다', () => {
		render(<ErrorPageView title='페이지를 찾을 수 없어요' description='주소를 다시 확인해주세요.' />)

		const section = screen.getByRole('region', { name: '페이지를 찾을 수 없어요' })
		expect(section).toHaveAccessibleDescription('주소를 다시 확인해주세요.')
		expect(screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
	})

	it('주요 버튼과 보조 버튼을 각각의 동작에 연결한다', () => {
		const onPrimary = vi.fn()
		const onSecondary = vi.fn()
		render(
			<ErrorPageView
				title='문제가 발생했어요'
				primaryAction={{ label: '다시 시도', onClick: onPrimary }}
				secondaryAction={{ label: '홈으로', onClick: onSecondary }}
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
		fireEvent.click(screen.getByRole('button', { name: '홈으로' }))

		expect(onPrimary).toHaveBeenCalledOnce()
		expect(onSecondary).toHaveBeenCalledOnce()
	})

	it('액션이 없으면 버튼을 표시하지 않는다', () => {
		render(<ErrorPageView title='문제가 발생했어요' />)

		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})

	it('아이콘이 없으면 이음 심볼을 장식 이미지로, 있으면 아이콘을 표시하고 코드 배지를 붙인다', () => {
		const { container, rerender } = render(<ErrorPageView title='문제가 발생했어요' />)

		const symbol = container.querySelector('img')
		expect(symbol).toHaveAttribute('alt', '')
		expect(symbol).toHaveAttribute('draggable', 'false')

		rerender(<ErrorPageView title='페이지를 찾을 수 없어요' icon={FileQuestion} code='404' />)

		expect(container.querySelector('img')).toBeNull()
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
		expect(screen.getByText('404')).toBeInTheDocument()
	})

	it('일러스트가 있으면 아이콘 대신 드래그되지 않는 장식 이미지로 표시한다', () => {
		const { container } = render(
			<ErrorPageView title='페이지를 찾을 수 없어요' icon={FileQuestion} illustrationSrc='/404symbol.png' />
		)

		const illustration = container.querySelector('img')
		expect(illustration).toHaveAttribute('src', '/404symbol.png')
		expect(illustration).toHaveAttribute('alt', '')
		expect(illustration).toHaveAttribute('draggable', 'false')
		expect(container.querySelector('svg')).toBeNull()
	})
})
