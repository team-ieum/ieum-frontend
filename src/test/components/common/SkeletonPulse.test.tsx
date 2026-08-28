import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import { setReducedMotion } from '@/test/domEnvironment'

describe('SkeletonPulse', () => {
	it('neutral div 안에서 하이라이트를 왼쪽에서 오른쪽으로 이동시킨다', async () => {
		const { container } = render(<SkeletonPulse className='h-4 w-20 bg-neutral-200' />)
		const skeleton = container.firstElementChild
		const highlight = skeleton?.querySelector<HTMLElement>('[data-skeleton-highlight]')

		expect(skeleton?.tagName).toBe('DIV')
		expect(skeleton).toHaveAttribute('aria-hidden', 'true')
		expect(highlight?.getAttribute('style')).toContain('0.24')
		expect(highlight?.getAttribute('style')).toContain('0.14')
		await waitFor(() => expect(highlight?.style.transform).not.toBe('none'))
	})

	it('brand tone과 span wrapper를 지원한다', () => {
		const { container } = render(<SkeletonPulse as='span' tone='brand' className='h-4 w-20 bg-main-blue' />)
		const skeleton = container.firstElementChild
		const highlight = skeleton?.querySelector<HTMLElement>('[data-skeleton-highlight]')

		expect(skeleton?.tagName).toBe('SPAN')
		expect(highlight?.getAttribute('style')).toContain('0.1')
		expect(highlight?.getAttribute('style')).toContain('0.06')
	})

	it('reduced-motion에서는 움직이는 하이라이트를 렌더링하지 않는다', () => {
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		setReducedMotion(true)

		const { container } = render(<SkeletonPulse className='h-4 w-20 bg-neutral-200' />)

		expect(container.querySelector('[data-skeleton-highlight]')).not.toBeInTheDocument()
		warning.mockRestore()
	})
})
