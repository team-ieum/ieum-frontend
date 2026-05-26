import { History, Rocket, Sparkles, Webhook, type LucideIcon } from 'lucide-react'
import type {
	WorkflowCategoryId,
	WorkflowServiceId,
	WorkflowSortKey,
	WorkflowStatus,
	WorkflowTriggerType,
} from '@/types/workflowList'

export type WorkflowServiceMeta = {
	id: WorkflowServiceId
	name: string
	initial: string
	color: string
	foreground: string
}

export type WorkflowCategoryMeta = {
	id: WorkflowCategoryId
	label: string
	color: string
}

export type WorkflowStatusMeta = {
	label: string
	toneClass: string
	dotColor: string
}

export type WorkflowTriggerMeta = {
	label: string
	icon: LucideIcon
}

export type WorkflowSortOption = {
	id: WorkflowSortKey
	label: string
}

export const WORKFLOW_SERVICE_META: Record<WorkflowServiceId, WorkflowServiceMeta> = {
	google: { id: 'google', name: 'Google', initial: 'G', color: '#4285F4', foreground: '#ffffff' },
	slack: { id: 'slack', name: 'Slack', initial: 'S', color: '#4A154B', foreground: '#ffffff' },
	hubspot: { id: 'hubspot', name: 'HubSpot', initial: 'H', color: '#FF7A59', foreground: '#ffffff' },
	salesforce: { id: 'salesforce', name: 'Salesforce', initial: 'Sf', color: '#00A1E0', foreground: '#ffffff' },
	airtable: { id: 'airtable', name: 'Airtable', initial: 'A', color: '#18BFFF', foreground: '#ffffff' },
	notion: { id: 'notion', name: 'Notion', initial: 'N', color: '#191919', foreground: '#ffffff' },
	github: { id: 'github', name: 'GitHub', initial: 'Gh', color: '#24292F', foreground: '#ffffff' },
	linear: { id: 'linear', name: 'Linear', initial: 'L', color: '#5E6AD2', foreground: '#ffffff' },
	figma: { id: 'figma', name: 'Figma', initial: 'F', color: '#A259FF', foreground: '#ffffff' },
	jira: { id: 'jira', name: 'Jira', initial: 'J', color: '#0C66E4', foreground: '#ffffff' },
	dropbox: { id: 'dropbox', name: 'Dropbox', initial: 'D', color: '#0061FF', foreground: '#ffffff' },
	discord: { id: 'discord', name: 'Discord', initial: 'Di', color: '#5865F2', foreground: '#ffffff' },
	zapier: { id: 'zapier', name: 'Zapier', initial: 'Z', color: '#FF4A00', foreground: '#ffffff' },
	asana: { id: 'asana', name: 'Asana', initial: 'As', color: '#F06A6A', foreground: '#ffffff' },
}

export const WORKFLOW_SERVICES = Object.values(WORKFLOW_SERVICE_META)

export const WORKFLOW_CATEGORY_META: Record<WorkflowCategoryId, WorkflowCategoryMeta> = {
	cs: { id: 'cs', label: '고객지원', color: '#E2725B' },
	marketing: { id: 'marketing', label: '마케팅', color: '#7D8CC4' },
	dev: { id: 'dev', label: '개발', color: '#007BA7' },
	sales: { id: 'sales', label: '영업', color: '#006A4E' },
	ops: { id: 'ops', label: '내부 운영', color: '#4F5D75' },
	data: { id: 'data', label: '데이터/리포팅', color: '#B58900' },
}

export const WORKFLOW_CATEGORIES = Object.values(WORKFLOW_CATEGORY_META)

export const WORKFLOW_TRIGGER_META: Record<WorkflowTriggerType, WorkflowTriggerMeta> = {
	schedule: { label: '스케줄', icon: History },
	webhook: { label: '웹훅', icon: Webhook },
	event: { label: '이벤트', icon: Sparkles },
	manual: { label: '수동', icon: Rocket },
}

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, WorkflowStatusMeta> = {
	active: {
		label: '활성',
		toneClass: 'border-node-green/15 bg-node-green/10 text-node-green',
		dotColor: '#006A4E',
	},
	paused: {
		label: '일시정지',
		toneClass: 'border-neutral-200 bg-neutral-100 text-neutral-500',
		dotColor: '#959595',
	},
	error: {
		label: '에러',
		toneClass: 'border-danger-200 bg-danger-100 text-danger-700',
		dotColor: '#EC2D30',
	},
}

export const WORKFLOW_STATUS_ORDER: WorkflowStatus[] = ['error', 'active', 'paused']

export const WORKFLOW_SORT_OPTIONS: WorkflowSortOption[] = [
	{ id: 'recent', label: '기본순' },
	{ id: 'name', label: '이름순' },
	{ id: 'runs', label: '실행 수' },
	{ id: 'status', label: '상태순' },
]
