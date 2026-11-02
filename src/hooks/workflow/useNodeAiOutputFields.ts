import type { NodeCatalogEntry } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import {
	findAiOutputFieldsField,
	getAiOutputFieldLabels,
	MAX_AI_OUTPUT_FIELDS,
	readAiOutputFieldRows,
	toAiOutputFieldsValue,
	validateAiOutputFields,
	type AiOutputFieldRow,
} from '@/utils/workflow/aiOutputFields'
import { getAtPath } from '@/utils/workflow/objectPath'
import { updateNodeField } from '@/utils/workflow/updateNodeField'

const NEW_ROW: AiOutputFieldRow = { key: '', type: 'text', description: '' }

type UseNodeAiOutputFieldsOptions = {
	node: WorkflowNodeDto
	entry: NodeCatalogEntry | undefined
	onNodeChange: (node: WorkflowNodeDto) => void
}

/**
 * AI 노드 출력 칸 편집기가 그릴 행·오류와 행 추가·변경·삭제 콜백을 만든다.
 * 카탈로그 항목에 출력 칸 입력이 없으면(`ai.agent` 등) `undefined`다.
 * 규칙에 어긋난 값도 입력한 그대로 저장하고 오류로만 알린다. 마지막 행을 지우면 칸 키를 지운다.
 */
export const useNodeAiOutputFields = ({ node, entry, onNodeChange }: UseNodeAiOutputFieldsOptions) => {
	const field = entry ? findAiOutputFieldsField(entry) : undefined
	if (!entry || !field) return undefined

	const value = getAtPath(node, field.path)
	// 목록이 아닌 값은 행으로 고칠 수 없어 비우기만 허용한다.
	const rows = readAiOutputFieldRows(value)
	const validation = validateAiOutputFields(value)

	const write = (nextRows: AiOutputFieldRow[]) =>
		onNodeChange(updateNodeField(node, entry, field, toAiOutputFieldsValue(nextRows)))

	return {
		field,
		labels: getAiOutputFieldLabels(field),
		/** 행 key 동기화용 원본 값. 바뀌면 편집기가 행 목록을 다시 맞춘다. */
		value,
		rows,
		validation,
		canAdd: rows !== undefined && rows.length < MAX_AI_OUTPUT_FIELDS,
		addRow: () => {
			if (rows && rows.length < MAX_AI_OUTPUT_FIELDS) write([...rows, NEW_ROW])
		},
		changeRow: (index: number, patch: Partial<AiOutputFieldRow>) => {
			if (rows) write(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
		},
		removeRow: (index: number) => {
			if (rows) write(rows.filter((_, rowIndex) => rowIndex !== index))
		},
		clear: () => onNodeChange(updateNodeField(node, entry, field, undefined)),
	}
}

export type NodeAiOutputFields = NonNullable<ReturnType<typeof useNodeAiOutputFields>>
