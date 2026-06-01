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
	nextCursor: string
}
