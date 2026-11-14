import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { deleteAtPath, getAtPath, setAtPath } from '@/utils/workflow/objectPath'

/** 도구를 쓰는 AI 노드 event. 도구를 모두 빼면 `AI_REASONING_EVENT`로 바뀐다. */
export const AI_AGENT_EVENT = 'ai.agent'
/** 도구 없는 AI 노드 event. 도구를 고르면 `AI_AGENT_EVENT`로 바뀐다. */
const AI_REASONING_EVENT = 'ai.reasoning'

type AiNodeEvent = typeof AI_AGENT_EVENT | typeof AI_REASONING_EVENT

const TOOLS_PATH = 'config.tools'

// AI에게 맡길 수 없어 반드시 고정 값을 넣어야 하는 도구 칸(명세: slack·discord 웹훅).
const FIXED_ONLY_TOOL_FIELD_KEYS = new Set(['webhookCredentialId'])

// 비우면 AI가 정하지 않고 서버 기본값으로 고정되는 도구 칸(명세).
const SERVER_DEFAULT_TOOL_FIELD_KEYS: Record<string, string[]> = {
	'builtin:google_calendar_update': ['scope', 'send_updates', 'attendees'],
}

// 도구 카드에 보여 줄 칸. 없는 도구는 ACTION 항목 칸을 모두 보여 준다.
// Calendar 수정 도구는 일정·내용을 AI가 정하고, 반복 범위·알림만 고정할 수 있다(명세: 참석자는 숨김).
const VISIBLE_TOOL_FIELD_KEYS: Record<string, string[]> = {
	'builtin:google_calendar_update': ['scope', 'send_updates'],
}

export const isAiNodeEvent = (event: string): event is AiNodeEvent => event === AI_AGENT_EVENT || event === AI_REASONING_EVENT

/** 두 AI 노드가 함께 쓰는 도구 칸 정의. `ai.reasoning` 항목에는 없어 `ai.agent` 항목에서 찾는다. */
export const findAiToolsField = (entries: NodeCatalogEntry[]) =>
	entries.find(entry => entry.id === AI_AGENT_EVENT)?.inputFields.find(field => field.path === TOOLS_PATH)

/** 도구 칸을 그리는 ACTION 항목. 도구 키(`tools[i].name`)가 항목 `toolKey`와 같다. */
export const findAiToolEntry = (entries: NodeCatalogEntry[], toolKey: string) =>
	entries.find(entry => entry.nodeType === 'ACTION' && entry.toolKey === toolKey)

const getToolName = (tool: unknown) => {
	if (typeof tool === 'string') return tool
	if (typeof tool === 'object' && tool !== null && 'name' in tool && typeof tool.name === 'string') return tool.name
	return ''
}

/** 노드에 저장된 도구 이름을 원소 순서대로 읽는다. 이름을 읽을 수 없는 원소는 빈 이름이다. */
export const readAiToolNames = (node: WorkflowNodeDto): string[] => {
	const tools = getAtPath(node, TOOLS_PATH)
	return Array.isArray(tools) ? tools.map(getToolName) : []
}

/**
 * AI 노드의 event를 바꾸고 `agentType`을 바꿀 event 카탈로그 항목의 `fixed.config.agentType`으로 맞춘다.
 * AI 노드가 아니거나, 이미 그 event거나, 카탈로그에 그 항목이 없으면 그대로 돌려준다.
 */
const switchAiEvent = (node: WorkflowNodeDto, event: AiNodeEvent, entries: NodeCatalogEntry[]): WorkflowNodeDto => {
	if (!isAiNodeEvent(node.event) || node.event === event) return node
	const target = entries.find(entry => entry.id === event)
	if (!target) return node
	const agentType = target.fixed.config.agentType
	return { ...(agentType === undefined ? node : setAtPath(node, 'config.agentType', agentType)), event }
}

/**
 * 도구 원소 `{name, config: {}}`를 붙인 새 노드를 돌려준다. 이미 고른 도구면 그대로 돌려준다.
 * 도구 없는 AI 노드는 도구를 쓰는 `ai.agent`로 바꾼다. `agentType`은 카탈로그 `entries`의 `ai.agent` 항목을 따른다.
 */
export const addAiTool = (node: WorkflowNodeDto, toolKey: string, entries: NodeCatalogEntry[]): WorkflowNodeDto => {
	const tools = getAtPath(node, TOOLS_PATH)
	const list = Array.isArray(tools) ? tools : []
	if (list.some(tool => getToolName(tool) === toolKey)) return node
	return switchAiEvent(setAtPath(node, TOOLS_PATH, [...list, { name: toolKey, config: {} }]), AI_AGENT_EVENT, entries)
}

/**
 * `index` 도구 원소를 통째로 뺀 새 노드를 돌려준다.
 * 남은 도구가 없으면 `ai.reasoning`으로 바꾸고, `agentType`은 카탈로그 `entries`의 `ai.reasoning` 항목을 따른다.
 */
export const removeAiTool = (node: WorkflowNodeDto, index: number, entries: NodeCatalogEntry[]): WorkflowNodeDto => {
	const next = deleteAtPath(node, `${TOOLS_PATH}.${index}`)
	return readAiToolNames(next).length === 0 ? switchAiEvent(next, AI_REASONING_EVENT, entries) : next
}

/**
 * 도구 칸을 쓰기 전에 `index` 원소를 객체 원소로 맞춘다.
 * 저장은 항상 `{name, config}` 객체 원소라, 이름만 있는 문자열 원소는 칸을 처음 쓸 때 객체로 바꾼다.
 */
export const ensureAiToolObject = (node: WorkflowNodeDto, index: number): WorkflowNodeDto => {
	const tool = getAtPath(node, `${TOOLS_PATH}.${index}`)
	return typeof tool === 'string' ? setAtPath(node, `${TOOLS_PATH}.${index}`, { name: tool, config: {} }) : node
}

/**
 * 도구 ACTION 항목을 `index` 도구 원소의 칸으로 옮긴 항목을 만든다.
 * 칸 path `config.<key>`를 `config.tools.<index>.config.<key>`로 바꾸므로, 이 항목을 칸 값 쓰기·연쇄 목록 유틸에 그대로 넘기면
 * `_names`와 연쇄 부모 칸도 같은 도구 config 안에서 다룬다.
 * 도구 칸은 비우면 AI가 정하므로 반드시 고정해야 하는 칸만 필수로 남긴다.
 */
export const createAiToolFieldEntry = (toolEntry: NodeCatalogEntry, index: number): NodeCatalogEntry => ({
	...toolEntry,
	inputFields: toolEntry.inputFields.map(field => ({
		...field,
		path: `${TOOLS_PATH}.${index}.${field.path}`,
		required: FIXED_ONLY_TOOL_FIELD_KEYS.has(field.key),
	})),
})

/** 비운 도구 칸을 AI가 정하는지. 고정해야 하는 칸과 서버 기본값으로 고정되는 칸은 AI가 정하지 않는다. */
export const isAiDecidedWhenEmpty = (toolKey: string, fieldKey: string) =>
	!FIXED_ONLY_TOOL_FIELD_KEYS.has(fieldKey) && !SERVER_DEFAULT_TOOL_FIELD_KEYS[toolKey]?.includes(fieldKey)

/** 도구 카드에 그릴 칸만 고른다. 숨긴 칸에 저장된 값은 건드리지 않아 그대로 보존된다. */
export const getVisibleAiToolFields = (toolKey: string, fields: NodeCatalogInputField[]) => {
	const visibleKeys = VISIBLE_TOOL_FIELD_KEYS[toolKey]
	return visibleKeys ? fields.filter(field => visibleKeys.includes(field.key)) : fields
}
