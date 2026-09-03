import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIntegrationSectionNavigation } from '@/hooks/integration/useIntegrationSectionNavigation'
import { setReducedMotion } from '@/test/domEnvironment'

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('useIntegrationSectionNavigation', () => {
	it('상세에서 선택한 section은 callback으로 목록을 연 뒤 일반 motion으로 스크롤한다', () => {
		vi.useFakeTimers()
		const onReturnToList = vi.fn()
		const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
		const { result, rerender } = renderHook(
			({ isListView, shouldReturnToList }) =>
				useIntegrationSectionNavigation({ isListView, shouldReturnToList, onReturnToList }),
			{ initialProps: { isListView: false, shouldReturnToList: true } }
		)
		result.current.aiCredentialsSectionRef.current = document.createElement('section')

		act(() => result.current.handleSectionChange('aiCredentials'))
		expect(onReturnToList).toHaveBeenCalledOnce()
		expect(scrollIntoView).not.toHaveBeenCalled()

		rerender({ isListView: true, shouldReturnToList: false })
		act(() => vi.runAllTimers())
		expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })
	})

	it('reduced-motion에서는 AI section으로 즉시 스크롤한다', () => {
		vi.useFakeTimers()
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		setReducedMotion(true)
		const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
		const { result } = renderHook(() =>
			useIntegrationSectionNavigation({ isListView: true, shouldReturnToList: false, onReturnToList: vi.fn() })
		)
		result.current.aiCredentialsSectionRef.current = document.createElement('section')

		act(() => result.current.handleSectionChange('aiCredentials'))
		act(() => vi.runAllTimers())

		expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' })
	})

	it('빠르게 section을 다시 선택하면 이전 예약 스크롤을 취소한다', () => {
		vi.useFakeTimers()
		const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
		const scrollTo = vi.spyOn(window, 'scrollTo')
		const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame')
		const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')
		const { result } = renderHook(() =>
			useIntegrationSectionNavigation({ isListView: true, shouldReturnToList: false, onReturnToList: vi.fn() })
		)
		result.current.aiCredentialsSectionRef.current = document.createElement('section')

		act(() => result.current.handleSectionChange('aiCredentials'))
		expect(requestAnimationFrame).toHaveBeenCalledOnce()
		const scheduledFrame = requestAnimationFrame.mock.results[0].value

		act(() => result.current.handleSectionChange('services'))
		expect(cancelAnimationFrame).toHaveBeenCalledWith(scheduledFrame)
		act(() => vi.runAllTimers())

		expect(scrollIntoView).not.toHaveBeenCalled()
		expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
		expect(result.current.activeSection).toBe('services')
	})

	it('자동 스크롤 중에는 scroll spy를 막고 idle 이후 수동 위치와 동기화한다', () => {
		vi.useFakeTimers()
		const section = document.createElement('section')
		vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect)
		const { result } = renderHook(() =>
			useIntegrationSectionNavigation({ isListView: true, shouldReturnToList: false, onReturnToList: vi.fn() })
		)
		result.current.aiCredentialsSectionRef.current = section

		act(() => result.current.handleSectionChange('services'))
		act(() => window.dispatchEvent(new Event('scroll')))
		expect(result.current.activeSection).toBe('services')

		act(() => vi.advanceTimersByTime(200))
		act(() => window.dispatchEvent(new Event('scroll')))
		expect(result.current.activeSection).toBe('aiCredentials')
	})

	it('목록을 벗어나면 scroll listener와 idle timer를 정리한다', () => {
		vi.useFakeTimers()
		const removeEventListener = vi.spyOn(window, 'removeEventListener')
		const clearTimeout = vi.spyOn(window, 'clearTimeout')
		const { result, rerender } = renderHook(
			({ isListView }) =>
				useIntegrationSectionNavigation({ isListView, shouldReturnToList: false, onReturnToList: vi.fn() }),
			{ initialProps: { isListView: true } }
		)

		act(() => result.current.handleSectionChange('services'))
		act(() => window.dispatchEvent(new Event('scroll')))
		rerender({ isListView: false })

		expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
		expect(clearTimeout).toHaveBeenCalled()
	})
})
