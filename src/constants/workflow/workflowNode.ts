import type { WorkflowNodeIconKey, WorkflowNodeRole, WorkflowNodeStatus } from '@/types/workflow'

type WorkflowNodeMeta = {
	role: WorkflowNodeRole
	label: string
	iconKey: WorkflowNodeIconKey
	toneClass: string
}

export const WORKFLOW_NODE_META: Record<string, WorkflowNodeMeta> = {
	TRIGGER: {
		role: 'trigger',
		label: '시작 조건',
		iconKey: 'play',
		toneClass: '[--node-color:#2e8b68] [--node-tint:#dff2e9]',
	},
	HTTP: {
		role: 'action',
		label: 'HTTP 요청',
		iconKey: 'globe',
		toneClass: '[--node-color:#c75146] [--node-tint:#fce8e5]',
	},
	TRANSFORM: {
		role: 'action',
		label: '데이터 변환',
		iconKey: 'shuffle',
		toneClass: '[--node-color:#287fa4] [--node-tint:#e2f2f8]',
	},
	CONDITION: {
		role: 'action',
		label: '조건',
		iconKey: 'branch',
		toneClass: '[--node-color:#9a6700] [--node-tint:#fff1d6]',
	},
	AI: {
		role: 'ai',
		label: 'AI 작업',
		iconKey: 'bot',
		toneClass: '[--node-color:#6d5ce7] [--node-tint:#eeeafd]',
	},
}

const FALLBACK_NODE_META: WorkflowNodeMeta = {
	role: 'action',
	label: '작업',
	iconKey: 'workflow',
	toneClass: '[--node-color:#596b78] [--node-tint:#eef2f4]',
}

export const WORKFLOW_NODE_STATUS: Record<WorkflowNodeStatus, { label: string; description: string }> = {
	idle: { label: '준비', description: '실행을 기다리고 있어요' },
	running: { label: '실행 중', description: '지금 작업하고 있어요' },
	success: { label: '완료', description: '작업을 마쳤어요' },
	error: { label: '확인 필요', description: '설정을 다시 확인해주세요' },
}

export const getWorkflowNodeMeta = (nodeType: string): WorkflowNodeMeta =>
	WORKFLOW_NODE_META[nodeType] ?? { ...FALLBACK_NODE_META, label: nodeType || FALLBACK_NODE_META.label }
