import { useEffect, useRef, useState } from 'react'
import { getWorkflowChatHistory, sendWorkflowChat } from '@/api/workflow'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import type { ChatMessage } from '@/types/workflowChat'

const POLL_INTERVAL_MS = 3000

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
	const [selectedCredentialId, setSelectedCredentialIdState] = useState<string | null>(() =>
		localStorage.getItem('ieum-chat-credential-id')
	)

	const setSelectedCredentialId = (id: string | null) => {
		setSelectedCredentialIdState(id)
		if (id) {
			localStorage.setItem('ieum-chat-credential-id', id)
		} else {
			localStorage.removeItem('ieum-chat-credential-id')
		}
	}
	const bodyRef = useRef<HTMLDivElement>(null)
	const seenMessageIdsRef = useRef<Set<string>>(new Set())
	const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const { data: credentialsData } = useCredentialsQuery()
	const credentials = credentialsData?.data ?? []

	useEffect(() => {
		if (bodyRef.current) {
			bodyRef.current.scrollTop = bodyRef.current.scrollHeight
		}
	}, [messages, isTyping])

	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
		}
	}, [])

	const stopPolling = () => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current)
			pollingIntervalRef.current = null
		}
		setIsTyping(false)
	}

	const startPolling = (sid: string) => {
		pollingIntervalRef.current = setInterval(async () => {
			try {
				const res = await getWorkflowChatHistory(workflowId, { sessionId: sid })
				const newItems = res.data.content.filter(item => !seenMessageIdsRef.current.has(item.messageId))

				if (newItems.length > 0) {
					const latest = newItems[newItems.length - 1]
					seenMessageIdsRef.current.add(latest.messageId)
					setMessages(prev => [
						...prev,
						{
							type: 'assistant',
							body: latest.content,
							...(latest.type === 'INTEGRATION_REQUIRED' && latest.actions?.length
								? { actions: latest.actions }
								: {}),
						},
					])
					if (onCanvasUpdate && latest.nodes?.length) {
						onCanvasUpdate(latest.nodes, latest.edges ?? [])
					}
					stopPolling()
				}
			} catch {
				// 네트워크 오류 시 다음 틱에 재시도
			}
		}, POLL_INTERVAL_MS)
	}

	const handleSend = async () => {
		const text = input.trim()
		if (!text || isTyping) return

		setMessages(prev => [...prev, { type: 'user', body: text }])
		setInput('')
		setIsTyping(true)

		try {
			const res = await sendWorkflowChat(workflowId, {
				prompt: text,
				...(currentNodes.length > 0 ? { currentNodes, currentEdges } : {}),
				...(sessionId ? { sessionId } : {}),
				...(selectedCredentialId ? { credentialId: selectedCredentialId } : {}),
			})
			const newSessionId = res.data.sessionId
			setSessionId(newSessionId)
			startPolling(newSessionId)
		} catch {
			setMessages(prev => [...prev, { type: 'assistant', body: '요청 처리 중 오류가 발생했어요. 다시 시도해주세요.' }])
			setIsTyping(false)
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
		handleSend,
		handleKeyDown,
		bodyRef,
		credentials,
		selectedCredentialId,
		setSelectedCredentialId,
	}
}
