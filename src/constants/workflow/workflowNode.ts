import type { WorkflowNodeRole, WorkflowNodeStatus } from '@/types/workflow'

type WorkflowNodeMeta = {
	role: WorkflowNodeRole
	label: string
}

export const WORKFLOW_NODE_META: Record<string, WorkflowNodeMeta> = {
	TRIGGER: { role: 'trigger', label: '시작 조건' },
	AI: { role: 'ai', label: 'AI 작업' },
	HTTP: { role: 'action', label: 'HTTP 요청' },
	CONDITION: { role: 'action', label: '조건' },
	TRANSFORM: { role: 'action', label: '데이터 변환' },
}

export const WORKFLOW_NODE_STATUS: Record<WorkflowNodeStatus, { label: string; description: string }> = {
	idle: { label: '준비', description: '실행을 기다리고 있어요' },
	running: { label: '실행 중', description: '지금 작업하고 있어요' },
	success: { label: '완료', description: '작업을 마쳤어요' },
	error: { label: '확인 필요', description: '설정을 다시 확인해주세요' },
}

export const getWorkflowNodeMeta = (nodeType: string): WorkflowNodeMeta =>
	WORKFLOW_NODE_META[nodeType] ?? { role: 'action', label: nodeType || '작업' }
