import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CHAT_SCROLLBAR_VISIBLE_MS } from '@/constants/workflow/workflowChat'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'
import type { WorkflowChatScrollbarView, WorkflowChatViewModel } from '@/types/workflowChat'

type UseWorkflowChatViewModelArgs = {
	workflowId: string
	currentNodes: unknown[]
	currentEdges: unknown[]
	onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void
}

const EMPTY_SCROLLBAR: WorkflowChatScrollbarView = {
	isVisible: false,
	topPercent: 0,
	heightPercent: 0,
}

export const useWorkflowChatViewModel = ({
	workflowId,
	currentNodes,
	currentEdges,
	onCanvasUpdate,
}: UseWorkflowChatViewModelArgs): WorkflowChatViewModel => {
	const [isOpen, setIsOpen] = useState(false)
	const [scrollbar, setScrollbar] = useState<WorkflowChatScrollbarView>(EMPTY_SCROLLBAR)
	const chatBodyRef = useRef<HTMLDivElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const scrollbarHideTimerRef = useRef<number | undefined>(undefined)
	const isProgrammaticScrollRef = useRef(false)

	const chat = useWorkflowChat(workflowId, currentNodes, currentEdges, onCanvasUpdate)

	const focusInput = () => {
		requestAnimationFrame(() => {
			inputRef.current?.focus()
		})
	}

	const syncScrollbarMetrics = () => {
		const el = chatBodyRef.current
		if (!el) return

		const { scrollTop, scrollHeight, clientHeight } = el
		if (scrollHeight <= clientHeight) {
			setScrollbar(prev => ({ ...prev, topPercent: 0, heightPercent: 0 }))
			return
		}

		setScrollbar(prev => ({
			...prev,
			topPercent: (scrollTop / scrollHeight) * 100,
			heightPercent: (clientHeight / scrollHeight) * 100,
		}))
	}

	const revealScrollbar = () => {
		syncScrollbarMetrics()
		setScrollbar(prev => ({ ...prev, isVisible: true }))
		window.clearTimeout(scrollbarHideTimerRef.current)
		scrollbarHideTimerRef.current = window.setTimeout(() => {
			setScrollbar(prev => ({ ...prev, isVisible: false }))
		}, CHAT_SCROLLBAR_VISIBLE_MS)
	}

	const onChatBodyScroll = () => {
		if (isProgrammaticScrollRef.current) {
			syncScrollbarMetrics()
			return
		}
		revealScrollbar()
	}

	useEffect(() => {
		if (!isOpen) return

		const frameId = requestAnimationFrame(() => {
			isProgrammaticScrollRef.current = true
			messagesEndRef.current?.scrollIntoView({ block: 'end' })
			syncScrollbarMetrics()
			requestAnimationFrame(() => {
				isProgrammaticScrollRef.current = false
			})
		})

		return () => cancelAnimationFrame(frameId)
	}, [isOpen, chat.messages, chat.isTyping, chat.currentStage])

	useEffect(() => {
		if (!isOpen) return
		focusInput()
	}, [isOpen])

	useEffect(() => {
		return () => {
			window.clearTimeout(scrollbarHideTimerRef.current)
		}
	}, [])

	const openChat = () => setIsOpen(true)
	const closeChat = () => setIsOpen(false)

	const handleSend = () => {
		void chat.handleSend()
		focusInput()
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSend()
		}
	}

	return {
		isOpen,
		openChat,
		closeChat,
		messages: chat.messages,
		input: chat.input,
		setInput: chat.setInput,
		isTyping: chat.isTyping,
		currentStage: chat.currentStage,
		credentials: chat.credentials,
		selectedCredentialId: chat.selectedCredentialId,
		setSelectedCredentialId: chat.setSelectedCredentialId,
		handleSend,
		handleKeyDown,
		scrollbar,
		onChatBodyScroll,
		chatBodyRef,
		messagesEndRef,
		inputRef,
	}
}
