import type {
	WorkflowCategoryId,
	WorkflowCategoryMeta,
	WorkflowServiceId,
	WorkflowServiceMeta,
	WorkflowSortOption,
	WorkflowStatus,
	WorkflowStatusMeta,
	WorkflowTriggerMeta,
	WorkflowTriggerType,
} from '@/types/workflowList'

export const WORKFLOW_SERVICE_META: Record<WorkflowServiceId, WorkflowServiceMeta> = {
	google: { id: 'google', name: 'Google', initial: 'G', bgClass: 'bg-[#4285F4]' },
	slack: { id: 'slack', name: 'Slack', initial: 'S', bgClass: 'bg-[#4A154B]' },
	hubspot: { id: 'hubspot', name: 'HubSpot', initial: 'H', bgClass: 'bg-[#FF7A59]' },
	salesforce: { id: 'salesforce', name: 'Salesforce', initial: 'Sf', bgClass: 'bg-[#00A1E0]' },
	airtable: { id: 'airtable', name: 'Airtable', initial: 'A', bgClass: 'bg-[#18BFFF]' },
	notion: { id: 'notion', name: 'Notion', initial: 'N', bgClass: 'bg-[#191919]' },
	github: { id: 'github', name: 'GitHub', initial: 'Gh', bgClass: 'bg-[#24292F]' },
	linear: { id: 'linear', name: 'Linear', initial: 'L', bgClass: 'bg-[#5E6AD2]' },
	figma: { id: 'figma', name: 'Figma', initial: 'F', bgClass: 'bg-[#A259FF]' },
	jira: { id: 'jira', name: 'Jira', initial: 'J', bgClass: 'bg-[#0C66E4]' },
	dropbox: { id: 'dropbox', name: 'Dropbox', initial: 'D', bgClass: 'bg-[#0061FF]' },
	discord: { id: 'discord', name: 'Discord', initial: 'Di', bgClass: 'bg-[#5865F2]' },
	zapier: { id: 'zapier', name: 'Zapier', initial: 'Z', bgClass: 'bg-[#FF4A00]' },
	asana: { id: 'asana', name: 'Asana', initial: 'As', bgClass: 'bg-[#F06A6A]' },
}

export const WORKFLOW_SERVICES = Object.values(WORKFLOW_SERVICE_META)

export const WORKFLOW_CATEGORY_META: Record<WorkflowCategoryId, WorkflowCategoryMeta> = {
	cs: { id: 'cs', label: '고객지원', dotClass: 'bg-[#E2725B]' },
	marketing: { id: 'marketing', label: '마케팅', dotClass: 'bg-[#7D8CC4]' },
	dev: { id: 'dev', label: '개발', dotClass: 'bg-[#007BA7]' },
	sales: { id: 'sales', label: '영업', dotClass: 'bg-[#006A4E]' },
	ops: { id: 'ops', label: '내부 운영', dotClass: 'bg-[#4F5D75]' },
	data: { id: 'data', label: '데이터/리포팅', dotClass: 'bg-[#B58900]' },
}

export const WORKFLOW_CATEGORIES = Object.values(WORKFLOW_CATEGORY_META)

export const WORKFLOW_TRIGGER_META: Record<WorkflowTriggerType, WorkflowTriggerMeta> = {
	schedule: { label: '스케줄' },
	webhook: { label: '웹훅' },
	event: { label: '이벤트' },
	manual: { label: '수동' },
}

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, WorkflowStatusMeta> = {
	active: {
		label: '활성',
		toneClass: 'border-node-green/15 bg-node-green/10 text-node-green',
		barClass: 'bg-[#006A4E]',
		dotBgClass: 'bg-[#006A4E]',
		dotRingClass: 'shadow-[0_0_0_3px_#006A4E22]',
	},
	paused: {
		label: '일시정지',
		toneClass: 'border-neutral-200 bg-neutral-100 text-neutral-500',
		barClass: 'bg-[#959595]',
		dotBgClass: 'bg-[#959595]',
	},
	error: {
		label: '에러',
		toneClass: 'border-danger-200 bg-danger-100 text-danger-700',
		barClass: 'bg-[#EC2D30]',
		dotBgClass: 'bg-[#EC2D30]',
	},
}

export const WORKFLOW_STATUS_ORDER: WorkflowStatus[] = ['error', 'active', 'paused']

export const WORKFLOW_SORT_OPTIONS: WorkflowSortOption[] = [
	{ id: 'recent', label: '기본순' },
	{ id: 'name', label: '이름순' },
	{ id: 'runs', label: '실행 수' },
	{ id: 'status', label: '상태순' },
]
