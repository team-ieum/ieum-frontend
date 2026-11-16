import type { KeyboardEvent, RefObject } from 'react'
import type { WorkflowEdgeDto, WorkflowNodeDto } from './workflowList'
export type ChatMessage = { type: 'user'; body: string } | { type: 'assistant'; body: string; actions?: WorkflowChatAction[] }

interface WorkflowChatAction {
	type: string
	provider: string
	label: string
	oauthUrl: string
}

interface WorkflowChatOption {
	value: string
	label: string
	description: string
}

export interface WorkflowChatRequest {
	prompt: string
	currentNodes?: WorkflowNodeDto[]
	currentEdges?: WorkflowEdgeDto[]
	sessionId?: string
	credentialId?: string
	/**
	 * 채팅에 쓸 모델 ID(`/api/v1/providers`의 model id). credentialId가 있을 때만 보낸다.
	 * 서버가 이 값을 읽어 적용하는지는 아직 백엔드와 맞추지 않았다. 계약이 정해지면 필드 이름을 맞추고 이 안내를 지운다.
	 */
	model?: string
}

export type WorkflowChatConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

type WorkflowChatStreamType = 'token' | 'stage' | 'done' | 'complete' | 'error'

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

export type WorkflowChatModelOption = {
	id: string
	label: string
	isDefault: boolean
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
	selectCredential: (id: string) => void
	onModelMenuKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
	modelMenuRef: RefObject<HTMLDivElement | null>
	/** 선택한 자격 증명 제공자의 모델 목록. 자격 증명을 고르지 않았으면 비어 있다. */
	modelOptions: WorkflowChatModelOption[]
	selectedModelOption: WorkflowChatModelOption | null
	isModelIdMenuOpen: boolean
	toggleModelIdMenu: () => void
	selectModelId: (id: string) => void
	onModelIdMenuKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
	modelIdMenuRef: RefObject<HTMLDivElement | null>
	handleSend: () => void
	handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
	scrollbar: WorkflowChatScrollbarView
	onChatBodyScroll: () => void
	chatBodyRef: RefObject<HTMLDivElement | null>
	messagesEndRef: RefObject<HTMLDivElement | null>
	inputRef: RefObject<HTMLTextAreaElement | null>
}
