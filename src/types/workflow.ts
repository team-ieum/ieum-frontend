import type { Node } from '@xyflow/react'

export type WorkflowNodeData = {
	brand: 'webhook' | 'openai' | 'filter' | 'slack' | 'notion' | 'warning'
	title: string
	method: string
	url: string
	check?: boolean
	warn?: boolean
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflowNode'>

export type ChatMessage = { type: 'assistant'; body: string } | { type: 'user'; body: string }
