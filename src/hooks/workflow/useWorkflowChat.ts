import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types/workflow'

const INITIAL_MESSAGES: ChatMessage[] = [
	{
		type: 'assistant',
		body: '안녕하세요! Lead Qualification Engine 워크플로우를 도와드릴게요. 현재 Webhook → GPT-4 → Filter 흐름이 구성되어 있어요. 어떤 작업을 도와드릴까요?',
	},
	{
		type: 'user',
		body: '필터 조건을 통과한 리드는 Notion에 저장하고, 이메일도 같이 발송해줘.',
	},
	{
		type: 'assistant',
		body: 'Filter 노드 이후에 Notion Create DB Row 노드와 Fallback Email 노드를 병렬로 추가했어요. 두 노드 모두 Filter의 "true" 분기에 연결됩니다.',
	},
	{
		type: 'user',
		body: 'GPT-4 분석 결과를 Slack #leads 채널에도 알림 보내줘.',
	},
	{
		type: 'assistant',
		body: 'GPT-4 노드에서 Slack Post to #support 노드로 연결을 추가했어요. 분류 결과가 실시간으로 #leads 채널에 전송됩니다.',
	},
]

const MOCK_RESPONSES = [
	'요청하신 노드를 워크플로우에 추가하고 연결했어요. 캔버스에서 변경 내용을 확인해보세요.',
	'알겠어요! 해당 단계를 워크플로우에 반영했습니다. 테스트 버튼으로 흐름을 확인할 수 있어요.',
	'워크플로우를 업데이트했어요. 추가로 수정이 필요한 부분이 있으면 말씀해주세요.',
]

export const useWorkflowChat = () => {
	const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
	const [input, setInput] = useState('')
	const [isTyping, setIsTyping] = useState(false)
	const responseIndexRef = useRef(0)
	const bodyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (bodyRef.current) {
			bodyRef.current.scrollTop = bodyRef.current.scrollHeight
		}
	}, [messages, isTyping])

	const handleSend = () => {
		const text = input.trim()
		if (!text || isTyping) return

		setMessages(prev => [...prev, { type: 'user', body: text }])
		setInput('')
		setIsTyping(true)

		setTimeout(() => {
			const response = MOCK_RESPONSES[responseIndexRef.current % MOCK_RESPONSES.length]
			responseIndexRef.current += 1
			setIsTyping(false)
			setMessages(prev => [...prev, { type: 'assistant', body: response }])
		}, 2000)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
	}

	return { messages, input, setInput, isTyping, handleSend, handleKeyDown, bodyRef }
}
