import { act, renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_SCROLLBAR_VISIBLE_MS } from '@/constants/workflow/workflowChat'
import { useWorkflowChatViewModel } from '@/hooks/workflow/useWorkflowChatViewModel'

const mocks = vi.hoisted(() => ({
	handleSend: vi.fn(),
	chat: {
		messages: [],
		input: '안녕하세요',
		setInput: () => {},
		isTyping: false,
		connectionStatus: 'idle',
		currentStage: null,
		handleKeyDown: () => {},
		credentials: [],
		selectedCredentialId: null,
		setSelectedCredentialId: () => {},
	},
}))

vi.mock('@/hooks/workflow/useWorkflowChat', () => ({
	useWorkflowChat: () => ({ ...mocks.chat, handleSend: mocks.handleSend }),
}))

const renderViewModel = () =>
	renderHook(() => useWorkflowChatViewModel({ workflowId: 'workflow-id', currentNodes: [], currentEdges: [] }))

const createKeyDownEvent = ({ key = 'Enter', shiftKey = false, isComposing = false } = {}) =>
	({
		key,
		shiftKey,
		nativeEvent: { isComposing },
		preventDefault: vi.fn(),
	}) as unknown as KeyboardEvent<HTMLTextAreaElement>

describe('useWorkflowChatViewModel', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	it('Enter를 누르면 기본 줄바꿈을 막고 메시지를 전송한다', () => {
		const { result } = renderViewModel()
		const event = createKeyDownEvent()

		act(() => result.current.handleKeyDown(event))

		expect(event.preventDefault).toHaveBeenCalledTimes(1)
		expect(mocks.handleSend).toHaveBeenCalledTimes(1)
	})

	it('Shift+Enter는 줄바꿈으로 두고 전송하지 않는다', () => {
		const { result } = renderViewModel()
		const event = createKeyDownEvent({ shiftKey: true })

		act(() => result.current.handleKeyDown(event))

		expect(event.preventDefault).not.toHaveBeenCalled()
		expect(mocks.handleSend).not.toHaveBeenCalled()
	})

	it('한글 조합 중 Enter는 전송하지 않는다', () => {
		const { result } = renderViewModel()
		const event = createKeyDownEvent({ isComposing: true })

		act(() => result.current.handleKeyDown(event))

		expect(event.preventDefault).not.toHaveBeenCalled()
		expect(mocks.handleSend).not.toHaveBeenCalled()
	})

	it('Enter가 아닌 키는 전송하지 않는다', () => {
		const { result } = renderViewModel()

		act(() => result.current.handleKeyDown(createKeyDownEvent({ key: 'a' })))

		expect(mocks.handleSend).not.toHaveBeenCalled()
	})

	it('사용자가 스크롤하면 스크롤바를 보여주고 일정 시간 뒤 숨긴다', () => {
		const { result } = renderViewModel()

		expect(result.current.scrollbar.isVisible).toBe(false)

		act(() => result.current.onChatBodyScroll())

		expect(result.current.scrollbar.isVisible).toBe(true)

		act(() => vi.advanceTimersByTime(CHAT_SCROLLBAR_VISIBLE_MS - 1))

		expect(result.current.scrollbar.isVisible).toBe(true)

		act(() => vi.advanceTimersByTime(1))

		expect(result.current.scrollbar.isVisible).toBe(false)
	})

	it('스크롤이 이어지면 숨김 타이머를 마지막 스크롤 기준으로 다시 시작한다', () => {
		const { result } = renderViewModel()

		act(() => result.current.onChatBodyScroll())
		act(() => vi.advanceTimersByTime(CHAT_SCROLLBAR_VISIBLE_MS - 500))
		act(() => result.current.onChatBodyScroll())
		act(() => vi.advanceTimersByTime(CHAT_SCROLLBAR_VISIBLE_MS - 1))

		expect(result.current.scrollbar.isVisible).toBe(true)

		act(() => vi.advanceTimersByTime(1))

		expect(result.current.scrollbar.isVisible).toBe(false)
	})

	it('openChat과 closeChat으로 채팅 패널 열림 상태를 바꾼다', () => {
		const { result } = renderViewModel()

		expect(result.current.isOpen).toBe(false)

		act(() => result.current.openChat())

		expect(result.current.isOpen).toBe(true)

		act(() => result.current.closeChat())

		expect(result.current.isOpen).toBe(false)
	})
})
