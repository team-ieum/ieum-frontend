import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSnapPastHeader } from '@/hooks/workflow/useSnapPastHeader'
import { setReducedMotion } from '@/test/domEnvironment'

const SETTLE_DELAY_MS = 80

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
})

// header 높이 0 + gap 24px이므로 snap 기준은 24px이고, 절반을 넘긴 15px은 24px로 스냅한다.
const settleScrollAt = (scrollY: number) => {
	Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
	window.dispatchEvent(new Event('scroll'))
	vi.advanceTimersByTime(SETTLE_DELAY_MS)
}

describe('useSnapPastHeader', () => {
	it('헤더 구간에서 멈춘 스크롤을 부드럽게 스냅한다', () => {
		vi.useFakeTimers()
		const scrollTo = vi.spyOn(window, 'scrollTo')
		renderHook(() => useSnapPastHeader({ current: document.createElement('header') }))

		settleScrollAt(15)

		expect(scrollTo).toHaveBeenCalledWith({ top: 24, behavior: 'smooth' })
	})

	it('reduced-motion에서는 smooth scroll 없이 즉시 스냅한다', () => {
		vi.useFakeTimers()
		setReducedMotion(true)
		const scrollTo = vi.spyOn(window, 'scrollTo')
		renderHook(() => useSnapPastHeader({ current: document.createElement('header') }))

		settleScrollAt(15)

		expect(scrollTo).toHaveBeenCalledWith({ top: 24, behavior: 'auto' })
	})
})
