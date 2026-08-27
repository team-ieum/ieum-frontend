import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { isWorkflowEdgeDto, isWorkflowNodeDto } from '@/utils/workflow/mapWorkflowCanvas'

const DRAFT_SCHEMA_VERSION = 1
const DRAFT_KEY_PREFIX = 'ieum-workflow-draft:v1:'

export type WorkflowDraftData = {
	title: string
	nodes: WorkflowNodeDto[]
	edges: WorkflowEdgeDto[]
}

export type WorkflowDraftRecord = WorkflowDraftData & {
	schemaVersion: typeof DRAFT_SCHEMA_VERSION
	workflowVersion: number
	updatedAt: string
}

const getStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

export const getWorkflowDraftKey = (workflowId: string) => `${DRAFT_KEY_PREFIX}${workflowId}`

const removeDraft = (workflowId: string) => {
	try {
		getStorage()?.removeItem(getWorkflowDraftKey(workflowId))
		return true
	} catch {
		return false
	}
}

const parseDraft = (value: string): WorkflowDraftRecord | null => {
	let draft: unknown

	try {
		draft = JSON.parse(value)
	} catch {
		return null
	}

	if (typeof draft !== 'object' || draft === null) return null
	const candidate = draft as Partial<WorkflowDraftRecord>
	if (
		candidate.schemaVersion !== DRAFT_SCHEMA_VERSION ||
		typeof candidate.workflowVersion !== 'number' ||
		!Number.isFinite(candidate.workflowVersion) ||
		typeof candidate.updatedAt !== 'string' ||
		typeof candidate.title !== 'string' ||
		!Array.isArray(candidate.nodes) ||
		!candidate.nodes.every(isWorkflowNodeDto) ||
		!Array.isArray(candidate.edges) ||
		!candidate.edges.every(isWorkflowEdgeDto)
	) {
		return null
	}

	const nodeIds = new Set(candidate.nodes.map(node => node.id))
	return {
		schemaVersion: DRAFT_SCHEMA_VERSION,
		workflowVersion: candidate.workflowVersion,
		updatedAt: candidate.updatedAt,
		title: candidate.title,
		nodes: candidate.nodes,
		edges: candidate.edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
	}
}

export const inspectWorkflowDraft = (workflowId: string, workflowVersion: number) => {
	let stored: string | null

	try {
		stored = getStorage()?.getItem(getWorkflowDraftKey(workflowId)) ?? null
	} catch {
		return { draft: null, shouldRemove: false }
	}

	if (!stored) return { draft: null, shouldRemove: false }
	const draft = parseDraft(stored)
	if (!draft || draft.workflowVersion !== workflowVersion) return { draft: null, shouldRemove: true }

	return { draft, shouldRemove: false }
}

export const readWorkflowDraft = (workflowId: string, workflowVersion: number) => {
	const result = inspectWorkflowDraft(workflowId, workflowVersion)
	if (result.shouldRemove) removeDraft(workflowId)
	return result.draft
}

export const writeWorkflowDraft = (workflowId: string, workflowVersion: number, draft: WorkflowDraftData) => {
	const record: WorkflowDraftRecord = {
		...draft,
		schemaVersion: DRAFT_SCHEMA_VERSION,
		workflowVersion,
		updatedAt: new Date().toISOString(),
	}

	try {
		const storage = getStorage()
		if (!storage) return false
		storage.setItem(getWorkflowDraftKey(workflowId), JSON.stringify(record))
		return true
	} catch {
		return false
	}
}

export const removeWorkflowDraft = (workflowId: string) => removeDraft(workflowId)

const normalizeDraft = (draft: WorkflowDraftData) => ({
	title: draft.title,
	nodes: draft.nodes,
	edges: draft.edges.map(edge => ({ ...edge, conditionType: edge.conditionType ?? null })),
})

export const isSameWorkflowDraft = (left: WorkflowDraftData, right: WorkflowDraftData) =>
	JSON.stringify(normalizeDraft(left)) === JSON.stringify(normalizeDraft(right))
