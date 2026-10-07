import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { PROVIDER_DISPLAY_NAME, PROVIDER_VISUAL } from '@/constants/aiCredentials'
import { CHAT_SCROLLBAR_VISIBLE_MS } from '@/constants/workflow/workflowChat'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'
import type { WorkflowChatCredentialOption, WorkflowChatScrollbarView, WorkflowChatViewModel } from '@/types/workflowChat'

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
	const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
	const [scrollbar, setScrollbar] = useState<WorkflowChatScrollbarView>(EMPTY_SCROLLBAR)
	const chatBodyRef = useRef<HTMLDivElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelMenuRef = useRef<HTMLDivElement>(null)
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

	useLayoutEffect(() => {
		const textarea = inputRef.current
		if (!textarea) return

		// 높이를 먼저 초기화해야 줄이 줄어들 때도 scrollHeight가 다시 작아진다
		textarea.style.height = 'auto'
		textarea.style.height = `${textarea.scrollHeight}px`
	}, [isOpen, chat.input])

	useEffect(() => {
		return () => {
			window.clearTimeout(scrollbarHideTimerRef.current)
		}
	}, [])

	useEffect(() => {
		if (!isModelMenuOpen) return

		const handleDocumentMouseDown = (event: MouseEvent) => {
			if (!modelMenuRef.current?.contains(event.target as Node)) {
				setIsModelMenuOpen(false)
			}
		}

		document.addEventListener('mousedown', handleDocumentMouseDown)
		return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
	}, [isModelMenuOpen])

	const credentialOptions: WorkflowChatCredentialOption[] = chat.credentials.map(credential => ({
		id: credential.id,
		label: PROVIDER_DISPLAY_NAME[credential.provider],
		brandColor: PROVIDER_VISUAL[credential.provider].brand,
	}))
	const selectedCredentialOption = credentialOptions.find(option => option.id === chat.selectedCredentialId) ?? null

	const openChat = () => setIsOpen(true)
	const closeChat = () => {
		setIsOpen(false)
		setIsModelMenuOpen(false)
	}

	const toggleModelMenu = () => setIsModelMenuOpen(prev => !prev)

	const selectCredential = (id: string | null) => {
		chat.setSelectedCredentialId(id)
		setIsModelMenuOpen(false)
		focusInput()
	}

	const onModelMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Escape') setIsModelMenuOpen(false)
	}

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
		credentialOptions,
		selectedCredentialOption,
		selectedCredentialId: chat.selectedCredentialId,
		isModelMenuOpen,
		toggleModelMenu,
		selectCredential,
		onModelMenuKeyDown,
		modelMenuRef,
		handleSend,
		handleKeyDown,
		scrollbar,
		onChatBodyScroll,
		chatBodyRef,
		messagesEndRef,
		inputRef,
	}
}
