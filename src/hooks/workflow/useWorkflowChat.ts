import { useEffect, useRef, useState } from 'react'
import { sendWorkflowChat } from '@/api/workflow'
import type { ChatMessage } from '@/types/workflow'

export const useWorkflowChat = (workflowId: string, currentNodes: unknown[], currentEdges: unknown[]) => {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState('')
	const [isTyping, setIsTyping] = useState(false)
	const [sessionId, setSessionId] = useState<string | null>(null)
	const bodyRef = useRef<HTMLDivElement>(null)

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
				// 노드가 있을 때만 포함 — 빈 배열이면 신규 생성으로 간주해 omit
				...(currentNodes.length > 0 ? { currentNodes, currentEdges } : {}),
				...(sessionId ? { sessionId } : {}),
			})

			const { type, content, actions } = res.data
			setSessionId(res.data.sessionId)

			setMessages(prev => [
				...prev,
				{
					type: 'assistant',
					body: content,
					...(type === 'INTEGRATION_REQUIRED' && actions?.length ? { actions } : {}),
				},
			])
		} catch {
			setMessages(prev => [...prev, { type: 'assistant', body: '요청 처리 중 오류가 발생했어요. 다시 시도해주세요.' }])
		} finally {
			setIsTyping(false)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
	}

	return { messages, input, setInput, isTyping, handleSend, handleKeyDown, bodyRef }
}
