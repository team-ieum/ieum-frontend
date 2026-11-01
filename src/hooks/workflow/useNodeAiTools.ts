import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import {
	AI_AGENT_EVENT,
	addAiTool,
	createAiToolFieldEntry,
	ensureAiToolObject,
	findAiToolEntry,
	findAiToolsField,
	isAiDecidedWhenEmpty,
	isAiNodeEvent,
	readAiToolNames,
	removeAiTool,
} from '@/utils/workflow/aiTools'
import { getMissingRequiredFields } from '@/utils/workflow/nodeFieldValue'
import { getOptionsInputsState } from '@/utils/workflow/nodeOptions'
import { getAtPath } from '@/utils/workflow/objectPath'
import { getFieldName, updateNodeField } from '@/utils/workflow/updateNodeField'

const AI_DECIDED_HINT = '비우면 AI가 정해요'

type UseNodeAiToolsOptions = {
	node: WorkflowNodeDto
	entries: NodeCatalogEntry[]
	onNodeChange: (node: WorkflowNodeDto) => void
}

/**
 * AI 노드 도구 칸(`config.tools`)이 그릴 도구 카드와 추가·빼기·칸 변경 콜백을 만든다.
 * AI 노드가 아니거나 카탈로그에 도구 칸이 없으면 `undefined`다.
 * 도구를 추가·빼면 도구 유무에 맞춰 노드 event가 `ai.agent`·`ai.reasoning`으로 바뀐다.
 */
export const useNodeAiTools = ({ node, entries, onNodeChange }: UseNodeAiToolsOptions) => {
	const toolsField = findAiToolsField(entries)
	if (!toolsField || !isAiNodeEvent(node.event)) return undefined

	const choices = toolsField.choices ?? []
	const toolNames = readAiToolNames(node)

	const addableTools = choices
		.filter(choice => !toolNames.includes(choice.id))
		.map(choice => ({ ...choice, appTitle: findAiToolEntry(entries, choice.id)?.appTitle }))

	const tools = toolNames.map((toolKey, index) => {
		const choice = choices.find(item => item.id === toolKey)
		// choices 밖 도구(mcp 등)는 칸을 그리지 않고 원소를 그대로 보존한다.
		const toolEntry = choice ? findAiToolEntry(entries, toolKey) : undefined
		const fieldEntry = toolEntry ? createAiToolFieldEntry(toolEntry, index) : undefined
		const fields = (fieldEntry?.inputFields ?? []).map(field => ({
			field,
			value: getAtPath(node, field.path),
			name: getFieldName(node, field),
			options:
				fieldEntry && field.optionsSource
					? { source: field.optionsSource, inputsState: getOptionsInputsState(fieldEntry, node, field) }
					: undefined,
			emptyHint: isAiDecidedWhenEmpty(toolKey, field.key) ? AI_DECIDED_HINT : undefined,
		}))

		const changeField = (field: NodeCatalogInputField, value: unknown, name?: string) => {
			if (fieldEntry) onNodeChange(updateNodeField(ensureAiToolObject(node, index), fieldEntry, field, value, name))
		}

		return {
			index,
			toolKey,
			title: choice?.name ?? toolKey,
			appTitle: toolEntry?.appTitle,
			isKnown: Boolean(choice),
			fields,
			missingRequiredCount: fieldEntry ? getMissingRequiredFields(fieldEntry, node).length : 0,
			changeField,
		}
	})

	return {
		toolsField,
		/** `ai.agent` 노드인지. 도구가 없는 `ai.agent`도 있어 도구 개수와 함께 안내 문구를 고르는 데 쓴다. */
		isAgent: node.event === AI_AGENT_EVENT,
		tools,
		addableTools,
		missingRequiredCount: tools.reduce((sum, tool) => sum + tool.missingRequiredCount, 0),
		addTool: (toolKey: string) => onNodeChange(addAiTool(node, toolKey, entries)),
		removeTool: (index: number) => onNodeChange(removeAiTool(node, index, entries)),
	}
}

export type NodeAiTools = NonNullable<ReturnType<typeof useNodeAiTools>>
export type NodeAiTool = NodeAiTools['tools'][number]
