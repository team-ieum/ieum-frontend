import { useEffect, useMemo, useRef, useState } from 'react'
import { sendWorkflowChat } from '@/api/workflow'
import { useCredentialsQuery } from '@/hooks/aiCredentials/queries/useCredentialsQuery'
import type { ChatMessage } from '@/types/workflowChat'

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
	const bodyRef = useRef<HTMLDivElement>(null)

	const { data: credentialsData } = useCredentialsQuery()
	const credentials = useMemo(() => credentialsData?.data ?? [], [credentialsData])

	useEffect(() => {
		if (!credentialsData) return
		if (selectedCredentialId && !credentials.find(c => c.id === selectedCredentialId)) {
			setSelectedCredentialIdState(null)
			localStorage.removeItem('ieum-chat-credential-id')
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
	}, [messages, isTyping])

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

			const { type, content, actions, nodes, edges, sessionId: newSessionId } = res.data
			setSessionId(newSessionId)

			setMessages(prev => [
				...prev,
				{
					type: 'assistant',
					body: content,
					...(type === 'INTEGRATION_REQUIRED' && actions?.length ? { actions } : {}),
				},
			])

			if (onCanvasUpdate && nodes?.length) {
				onCanvasUpdate(nodes, edges ?? [])
			}
		} catch {
			setMessages(prev => [...prev, { type: 'assistant', body: '요청 처리 중 오류가 발생했어요. 다시 시도해주세요.' }])
		} finally {
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
