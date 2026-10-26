import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'
import { isWorkflowEdgeDto, isWorkflowNodeDto } from '@/utils/workflow/mapWorkflowCanvas'

// v2: 노드 event 필수 전환. event 없는 v1 초안은 키가 달라 읽지 않고 removeLegacyWorkflowDrafts로 지운다.
const DRAFT_SCHEMA_VERSION = 2
const DRAFT_KEY_PREFIX = 'ieum-workflow-draft:v2:'
const LEGACY_DRAFT_KEY_PREFIXES = ['ieum-workflow-draft:v1:']

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

/** 이전 스키마 버전의 초안 키를 모두 지운다. 저장소에 접근할 수 없으면 아무것도 하지 않는다. */
export const removeLegacyWorkflowDrafts = () => {
	try {
		const storage = getStorage()
		if (!storage) return
		// 순회 중에 지우면 인덱스가 밀리므로 키를 먼저 모은다.
		const legacyKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
			(key): key is string => key !== null && LEGACY_DRAFT_KEY_PREFIXES.some(prefix => key.startsWith(prefix))
		)
		legacyKeys.forEach(key => storage.removeItem(key))
	} catch {
		// 저장소 접근이 막힌 환경에서는 정리를 건너뛴다.
	}
}

const normalizeDraft = (draft: WorkflowDraftData) => ({
	title: draft.title,
	nodes: draft.nodes,
	// 서버 응답의 레거시 엣지(id: null)와 캔버스에서 id를 생략한 엣지를 같은 값으로 본다.
	// JSON 문자열로 비교하므로 키 순서를 고정한다.
	edges: draft.edges.map(edge => ({
		id: edge.id ?? null,
		source: edge.source,
		target: edge.target,
		conditionType: edge.conditionType ?? null,
	})),
})

export const isSameWorkflowDraft = (left: WorkflowDraftData, right: WorkflowDraftData) =>
	JSON.stringify(normalizeDraft(left)) === JSON.stringify(normalizeDraft(right))
