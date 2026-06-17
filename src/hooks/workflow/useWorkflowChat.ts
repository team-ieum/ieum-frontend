import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SockJS from 'sockjs-client'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import { useAuthStore } from '@/stores/useAuthStore'
import type {
	ChatMessage,
	WorkflowChatConnectionStatus,
	WorkflowChatRequest,
	WorkflowChatResponseData,
	WorkflowChatStreamResponse,
} from '@/types/workflowChat'

const CHAT_STREAM_DESTINATION = '/user/queue/chat/stream'
const CONNECTION_TIMEOUT_MS = 8000

const getWebSocketUrl = (): string | null => {
	const apiUrl = import.meta.env.VITE_API_URL?.trim()
	return apiUrl ? `${apiUrl.replace(/\/$/, '')}/ws` : null
}

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string) =>
	new Promise<T>((resolve, reject) => {
		const timer = window.setTimeout(() => reject(new Error(message)), ms)

		promise.then(
			value => {
				window.clearTimeout(timer)
				resolve(value)
			},
			error => {
				window.clearTimeout(timer)
				reject(error)
			}
		)
	})

const createAssistantMessage = (data: WorkflowChatResponseData): ChatMessage => ({
	type: 'assistant',
	body: data.content,
	...(data.type === 'INTEGRATION_REQUIRED' && data.actions?.length ? { actions: data.actions } : {}),
})

export const useWorkflowChat = (
	workflowId: string,
	currentNodes: unknown[],
	currentEdges: unknown[],
	onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void
) => {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState('')
	const [isTyping, setIsTyping] = useState(false)
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [connectionStatus, setConnectionStatus] = useState<WorkflowChatConnectionStatus>('idle')
	const [currentStage, setCurrentStage] = useState<string | null>(null)
	const [selectedCredentialId, setSelectedCredentialIdState] = useState<string | null>(() =>
		localStorage.getItem('ieum-chat-credential-id')
	)
	const bodyRef = useRef<HTMLDivElement>(null)
	const clientRef = useRef<Client | null>(null)
	const subscriptionRef = useRef<StompSubscription | null>(null)
	const connectionReadyRef = useRef<Promise<void> | null>(null)
	const resolveConnectionRef = useRef<(() => void) | null>(null)
	const rejectConnectionRef = useRef<((error: Error) => void) | null>(null)
	const streamingAssistantIndexRef = useRef<number | null>(null)
	const onCanvasUpdateRef = useRef(onCanvasUpdate)
	const accessToken = useAuthStore(state => state.accessToken)

	const { data: credentialsData } = useCredentialsQuery()
	const credentials = useMemo(() => credentialsData?.data ?? [], [credentialsData])

	useEffect(() => {
		onCanvasUpdateRef.current = onCanvasUpdate
	}, [onCanvasUpdate])

	useEffect(() => {
		if (!credentialsData) return
		if (selectedCredentialId && !credentials.find(c => c.id === selectedCredentialId)) {
			localStorage.removeItem('ieum-chat-credential-id')
			queueMicrotask(() => setSelectedCredentialIdState(null))
		}
	}, [credentialsData, credentials, selectedCredentialId])

	const setSelectedCredentialId = (id: string | null) => {
		setSelectedCredentialIdState(id)
		if (id) {
			localStorage.setItem('ieum-chat-credential-id', id)
		} else {
			localStorage.removeItem('ieum-chat-credential-id')
		}
	}

	useEffect(() => {
		if (bodyRef.current) {
			bodyRef.current.scrollTop = bodyRef.current.scrollHeight
		}
	}, [messages, isTyping, currentStage])

	const createConnectionReady = useCallback(() => {
		const ready = new Promise<void>((resolve, reject) => {
			resolveConnectionRef.current = resolve
			rejectConnectionRef.current = reject
		})

		ready.catch(() => undefined)
		connectionReadyRef.current = ready
		return ready
	}, [])

	const setStreamedAssistantMessage = useCallback((content: string) => {
		setMessages(prev => {
			const index = streamingAssistantIndexRef.current

			if (index !== null && prev[index]?.type === 'assistant') {
				const next = [...prev]
				const current = next[index]
				next[index] = { ...current, body: `${current.body}${content}` }
				return next
			}

			streamingAssistantIndexRef.current = prev.length
			return [...prev, { type: 'assistant', body: content }]
		})
	}, [])

	const finishAssistantMessage = useCallback((message: ChatMessage) => {
		setMessages(prev => {
			const index = streamingAssistantIndexRef.current

			if (index !== null && prev[index]?.type === 'assistant') {
				const next = [...prev]
				next[index] = message
				streamingAssistantIndexRef.current = null
				return next
			}

			streamingAssistantIndexRef.current = null
			return [...prev, message]
		})
	}, [])

	const handleStreamMessage = useCallback(
		(message: IMessage) => {
			let response: WorkflowChatStreamResponse

			try {
				response = JSON.parse(message.body) as WorkflowChatStreamResponse
			} catch {
				setIsTyping(false)
				setCurrentStage(null)
				finishAssistantMessage({ type: 'assistant', body: '응답을 해석하는 중 오류가 발생했어요. 다시 시도해주세요.' })
				return
			}

			if (response.type === 'stage') {
				setCurrentStage(response.stage ?? response.content ?? null)
				return
			}

			if (response.type === 'token') {
				if (response.content) {
					setStreamedAssistantMessage(response.content)
				}
				return
			}

			if (response.type === 'complete' || (response.type === 'done' && !response.data)) {
				setIsTyping(false)
				setCurrentStage(null)
				streamingAssistantIndexRef.current = null
				return
			}

			if (response.type === 'error') {
				setIsTyping(false)
				setCurrentStage(null)
				finishAssistantMessage({
					type: 'assistant',
					body: response.content ?? 'AI 응답 중 오류가 발생했어요. 다시 시도해주세요.',
				})
				return
			}

			if (!response.data) {
				setIsTyping(false)
				setCurrentStage(null)
				finishAssistantMessage({ type: 'assistant', body: '응답 데이터가 비어 있어요. 다시 시도해주세요.' })
				return
			}

			setSessionId(response.data.sessionId)
			finishAssistantMessage(createAssistantMessage(response.data))
			setIsTyping(false)
			setCurrentStage(null)

			if (response.data.nodes?.length) {
				onCanvasUpdateRef.current?.(response.data.nodes, response.data.edges ?? [])
			}
		},
		[finishAssistantMessage, setStreamedAssistantMessage]
	)

	useEffect(() => {
		if (!workflowId || !accessToken) {
			queueMicrotask(() => setConnectionStatus('idle'))
			return
		}

		const webSocketUrl = getWebSocketUrl()
		if (!webSocketUrl) {
			queueMicrotask(() => setConnectionStatus('error'))
			return
		}

		createConnectionReady()

		const client = new Client({
			connectHeaders: {
				Authorization: `Bearer ${accessToken}`,
			},
			debug: () => undefined,
			heartbeatIncoming: 4000,
			heartbeatOutgoing: 4000,
			reconnectDelay: 3000,
			webSocketFactory: () => new SockJS(webSocketUrl),
			onConnect: () => {
				subscriptionRef.current?.unsubscribe()
				subscriptionRef.current = client.subscribe(CHAT_STREAM_DESTINATION, handleStreamMessage)
				setConnectionStatus('connected')
				resolveConnectionRef.current?.()
			},
			onStompError: frame => {
				const error = new Error(frame.headers.message ?? 'WebSocket 연결 오류가 발생했어요.')
				setConnectionStatus('error')
				rejectConnectionRef.current?.(error)
			},
			onWebSocketClose: () => {
				subscriptionRef.current = null

				if (client.active) {
					createConnectionReady()
					setConnectionStatus('connecting')
					return
				}

				setConnectionStatus('idle')
			},
			onWebSocketError: () => {
				const error = new Error('WebSocket 연결에 실패했어요.')
				setConnectionStatus('error')
				rejectConnectionRef.current?.(error)
			},
		})

		clientRef.current = client
		queueMicrotask(() => setConnectionStatus('connecting'))
		client.activate()

		return () => {
			subscriptionRef.current?.unsubscribe()
			subscriptionRef.current = null
			connectionReadyRef.current = null
			resolveConnectionRef.current = null
			rejectConnectionRef.current = null

			if (clientRef.current === client) {
				clientRef.current = null
			}

			void client.deactivate()
		}
	}, [accessToken, createConnectionReady, handleStreamMessage, workflowId])

	const waitForConnection = useCallback(async () => {
		const client = clientRef.current

		if (!accessToken) {
			throw new Error('로그인이 필요해요.')
		}

		if (!client) {
			throw new Error('채팅 연결을 준비하지 못했어요.')
		}

		if (client.connected) {
			return client
		}

		if (!connectionReadyRef.current) {
			createConnectionReady()
		}

		await withTimeout(connectionReadyRef.current!, CONNECTION_TIMEOUT_MS, '채팅 서버 연결 시간이 초과됐어요.')

		if (!client.connected) {
			throw new Error('채팅 서버에 연결되지 않았어요.')
		}

		return client
	}, [accessToken, createConnectionReady])

	const handleSend = async () => {
		const text = input.trim()
		if (!text || isTyping || !workflowId) return

		setMessages(prev => [...prev, { type: 'user', body: text }])
		setInput('')
		setIsTyping(true)
		setCurrentStage(null)
		streamingAssistantIndexRef.current = null

		try {
			const client = await waitForConnection()
			const body: WorkflowChatRequest = {
				prompt: text,
				...(currentNodes.length > 0 ? { currentNodes, currentEdges } : {}),
				...(sessionId ? { sessionId } : {}),
				...(selectedCredentialId ? { credentialId: selectedCredentialId } : {}),
			}

			client.publish({
				destination: `/app/chat/${workflowId}`,
				body: JSON.stringify(body),
			})
		} catch (error) {
			setIsTyping(false)
			setCurrentStage(null)
			finishAssistantMessage({
				type: 'assistant',
				body: error instanceof Error ? error.message : '요청 처리 중 오류가 발생했어요. 다시 시도해주세요.',
			})
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
	}

	return {
		messages,
		input,
		setInput,
		isTyping,
		connectionStatus,
		currentStage,
		handleSend,
		handleKeyDown,
		bodyRef,
		credentials,
		selectedCredentialId,
		setSelectedCredentialId,
	}
}
