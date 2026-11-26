import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowToolbarTitle from '@/components/workflow/WorkflowToolbarTitle'
import { setReducedMotion } from '@/test/domEnvironment'

// jsdom은 layout이 없어 너비가 모두 0이다. 제목 글자 너비(offsetWidth)와 보이는 자리(clientWidth)를 고정한다.
const stubWidths = ({ text, container }: { text: number; container: number }) => {
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(text)
	vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(container)
}

const renderTitle = (title = '아주 긴 워크플로우 제목') => {
	const onTitleChange = vi.fn()
	render(<WorkflowToolbarTitle title={title} onTitleChange={onTitleChange} />)
	const input = screen.getByRole('textbox', { name: '워크플로우 제목' })
	return { input, container: input.parentElement as HTMLElement, onTitleChange }
}

describe('WorkflowToolbarTitle', () => {
	afterEach(() => vi.restoreAllMocks())

	it('제목이 자리보다 길면 마우스를 올린 동안에만 흐른다', async () => {
		stubWidths({ text: 400, container: 200 })
		const user = userEvent.setup()
		const { container } = renderTitle()

		expect(container).not.toHaveAttribute('data-marquee')

		await user.hover(container)
		expect(container).toHaveAttribute('data-marquee', 'true')

		await user.unhover(container)
		expect(container).not.toHaveAttribute('data-marquee')
	})

	it('마우스를 올린 채 편집을 시작하면 흐르기를 멈춘다', async () => {
		stubWidths({ text: 400, container: 200 })
		const user = userEvent.setup()
		const { input, container } = renderTitle()
		await user.hover(container)
		expect(container).toHaveAttribute('data-marquee', 'true')

		await user.click(input)

		expect(container).not.toHaveAttribute('data-marquee')
	})

	it('제목이 자리에 모두 들어가면 마우스를 올려도 흐르지 않는다', async () => {
		stubWidths({ text: 200, container: 200 })
		const user = userEvent.setup()
		const { container } = renderTitle()

		await user.hover(container)

		expect(container).not.toHaveAttribute('data-marquee')
	})

	it('움직임 줄이기 설정이면 제목이 잘려도 마우스를 올려 흐르지 않는다', async () => {
		setReducedMotion(true)
		stubWidths({ text: 400, container: 200 })
		const user = userEvent.setup()
		const { container } = renderTitle()

		await user.hover(container)

		expect(container).not.toHaveAttribute('data-marquee')
	})

	it('입력한 제목을 onTitleChange로 전달한다', async () => {
		const user = userEvent.setup()
		const { input, onTitleChange } = renderTitle('')

		await user.type(input, '새')

		expect(onTitleChange).toHaveBeenCalledWith('새')
	})
})
