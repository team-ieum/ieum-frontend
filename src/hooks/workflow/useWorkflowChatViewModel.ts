import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { PROVIDER_DISPLAY_NAME, PROVIDER_VISUAL } from '@/constants/aiCredentials'
import { CHAT_SCROLLBAR_VISIBLE_MS } from '@/constants/workflow/workflowChat'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'
import type {
	WorkflowChatCredentialOption,
	WorkflowChatModelOption,
	WorkflowChatScrollbarView,
	WorkflowChatViewModel,
} from '@/types/workflowChat'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'

type UseWorkflowChatViewModelArgs = {
	workflowId: string
	currentNodes: WorkflowNodeDto[]
	currentEdges: WorkflowEdgeDto[]
	onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void
	/** 넘기면 열림 상태를 호출자가 가진다(빈 캔버스의 'AI로 만들기'처럼 바깥에서 채팅을 열 때). 없으면 스스로 관리한다. */
	isOpen?: boolean
	onOpenChange?: (isOpen: boolean) => void
}

/** 입력창 위의 두 선택 메뉴. 하나를 열면 다른 하나는 닫힌다. */
type ChatMenu = 'credential' | 'model'

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
	isOpen: controlledIsOpen,
	onOpenChange,
}: UseWorkflowChatViewModelArgs): WorkflowChatViewModel => {
	const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)
	const isOpen = controlledIsOpen ?? uncontrolledIsOpen
	const setIsOpen = (next: boolean) => {
		if (controlledIsOpen === undefined) setUncontrolledIsOpen(next)
		onOpenChange?.(next)
	}
	const [openMenu, setOpenMenu] = useState<ChatMenu | null>(null)
	const isModelMenuOpen = openMenu === 'credential'
	const isModelIdMenuOpen = openMenu === 'model'
	const [scrollbar, setScrollbar] = useState<WorkflowChatScrollbarView>(EMPTY_SCROLLBAR)
	const chatBodyRef = useRef<HTMLDivElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelMenuRef = useRef<HTMLDivElement>(null)
	const modelIdMenuRef = useRef<HTMLDivElement>(null)
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
		if (!openMenu) return

		const menuRef = openMenu === 'credential' ? modelMenuRef : modelIdMenuRef
		const handleDocumentMouseDown = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setOpenMenu(null)
			}
		}

		document.addEventListener('mousedown', handleDocumentMouseDown)
		return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
	}, [openMenu])

	const credentialOptions: WorkflowChatCredentialOption[] = chat.credentials
		.filter(credential => Object.hasOwn(PROVIDER_VISUAL, credential.provider))
		.map(credential => ({
			id: credential.id,
			label: PROVIDER_DISPLAY_NAME[credential.provider],
			brandColor: PROVIDER_VISUAL[credential.provider].brand,
		}))
	const selectedCredentialOption = credentialOptions.find(option => option.id === chat.selectedCredentialId) ?? null

	const modelOptions: WorkflowChatModelOption[] = chat.availableModels.map(model => ({
		id: model.id,
		label: model.displayName,
		isDefault: model.default === true,
	}))
	const selectedModelOption = modelOptions.find(option => option.id === chat.selectedModelId) ?? null

	const openChat = () => setIsOpen(true)
	const closeChat = () => {
		setIsOpen(false)
		setOpenMenu(null)
	}

	const toggleModelMenu = () => setOpenMenu(prev => (prev === 'credential' ? null : 'credential'))
	const toggleModelIdMenu = () => setOpenMenu(prev => (prev === 'model' ? null : 'model'))

	const selectCredential = (id: string) => {
		chat.setSelectedCredentialId(id)
		setOpenMenu(null)
		focusInput()
	}

	const selectModelId = (id: string) => {
		chat.setSelectedModelId(id)
		setOpenMenu(null)
		focusInput()
	}

	const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Escape') setOpenMenu(null)
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
		onModelMenuKeyDown: handleMenuKeyDown,
		modelMenuRef,
		modelOptions,
		selectedModelOption,
		isModelIdMenuOpen,
		toggleModelIdMenu,
		selectModelId,
		onModelIdMenuKeyDown: handleMenuKeyDown,
		modelIdMenuRef,
		handleSend,
		handleKeyDown,
		scrollbar,
		onChatBodyScroll,
		chatBodyRef,
		messagesEndRef,
		inputRef,
	}
}
