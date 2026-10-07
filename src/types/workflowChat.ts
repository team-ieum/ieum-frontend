import type { KeyboardEvent, RefObject } from 'react'
export type ChatMessage = { type: 'user'; body: string } | { type: 'assistant'; body: string; actions?: WorkflowChatAction[] }

export interface WorkflowChatAction {
	type: string
	provider: string
	label: string
	oauthUrl: string
}

export interface WorkflowChatOption {
	value: string
	label: string
	description: string
}

export interface WorkflowChatRequest {
	prompt: string
	currentNodes?: unknown[]
	currentEdges?: unknown[]
	sessionId?: string
	credentialId?: string
}

export type WorkflowChatConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type WorkflowChatStreamType = 'token' | 'stage' | 'done' | 'complete' | 'error'

export interface WorkflowChatStreamResponse {
	type: WorkflowChatStreamType
	content?: string
	index?: number
	totalTokens?: number
	stage?: string
	data?: WorkflowChatResponseData
}

export interface WorkflowChatResponseData {
	messageId: string
	sessionId: string
	type: string
	content: string
	changeDescription: string
	workflowName: string
	nodes: unknown[]
	edges: unknown[]
	actions: WorkflowChatAction[]
	options: WorkflowChatOption[]
	tokens: { inputTokens: number; outputTokens: number }
}

export interface WorkflowChatHistoryParams {
	sessionId: string
	page?: number
	size?: number
}

export interface WorkflowChatHistoryPage {
	content: WorkflowChatResponseData[]
	size: number
	hasNext: boolean
	nextCursor: string | null
}

// --- ViewModel (훅) ---

export type WorkflowChatScrollbarView = {
	isVisible: boolean
	topPercent: number
	heightPercent: number
}

export type WorkflowChatCredentialOption = {
	id: string
	label: string
	brandColor: string
}

export type WorkflowChatViewModel = {
	isOpen: boolean
	openChat: () => void
	closeChat: () => void
	messages: ChatMessage[]
	input: string
	setInput: (value: string) => void
	isTyping: boolean
	currentStage: string | null
	credentialOptions: WorkflowChatCredentialOption[]
	selectedCredentialOption: WorkflowChatCredentialOption | null
	selectedCredentialId: string | null
	isModelMenuOpen: boolean
	toggleModelMenu: () => void
	selectCredential: (id: string | null) => void
	onModelMenuKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
	modelMenuRef: RefObject<HTMLDivElement | null>
	handleSend: () => void
	handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
	scrollbar: WorkflowChatScrollbarView
	onChatBodyScroll: () => void
	chatBodyRef: RefObject<HTMLDivElement | null>
	messagesEndRef: RefObject<HTMLDivElement | null>
	inputRef: RefObject<HTMLTextAreaElement | null>
}
