import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types/workflow'

export const useWorkflowChat = () => {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState('')
	const isTyping = false
	const bodyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (bodyRef.current) {
			bodyRef.current.scrollTop = bodyRef.current.scrollHeight
		}
	}, [messages, isTyping])

	const handleSend = () => {
		const text = input.trim()
		if (!text) return

		setMessages(prev => [...prev, { type: 'user', body: text }])
		setInput('')
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
	}

	return { messages, input, setInput, isTyping, handleSend, handleKeyDown, bodyRef }
}
