import { useCallback, useEffect, useRef, useState } from 'react'
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
	const scrollbarHideTimerRef = useRef<number | undefined>(undefined)
	const isProgrammaticScrollRef = useRef(false)

	const chat = useWorkflowChat(workflowId, currentNodes, currentEdges, onCanvasUpdate)

	const syncScrollbarMetrics = useCallback(() => {
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
	}, [])

	const revealScrollbar = useCallback(() => {
		syncScrollbarMetrics()
		setScrollbar(prev => ({ ...prev, isVisible: true }))
		window.clearTimeout(scrollbarHideTimerRef.current)
		scrollbarHideTimerRef.current = window.setTimeout(() => {
			setScrollbar(prev => ({ ...prev, isVisible: false }))
		}, CHAT_SCROLLBAR_VISIBLE_MS)
	}, [syncScrollbarMetrics])

	const onChatBodyScroll = useCallback(() => {
		if (isProgrammaticScrollRef.current) {
			syncScrollbarMetrics()
			return
		}
		revealScrollbar()
	}, [revealScrollbar, syncScrollbarMetrics])

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
	}, [isOpen, chat.messages, chat.isTyping, chat.currentStage, syncScrollbarMetrics])

	useEffect(() => {
		return () => {
			window.clearTimeout(scrollbarHideTimerRef.current)
		}
	}, [])

	const openChat = useCallback(() => setIsOpen(true), [])
	const closeChat = useCallback(() => setIsOpen(false), [])

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
		handleSend: chat.handleSend,
		handleKeyDown: chat.handleKeyDown,
		scrollbar,
		onChatBodyScroll,
		chatBodyRef,
		messagesEndRef,
	}
}
