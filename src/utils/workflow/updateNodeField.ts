import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { deleteAtPath, getAtPath, setAtPath } from '@/utils/workflow/objectPath'

const getNamesPath = (field: NodeCatalogInputField) => {
	const parent = field.path.split('.').slice(0, -1).join('.')
	return `${parent}._names`
}

/** 칸의 표시 이름(`{칸 path의 부모}._names.{key}`)을 지우고, 남은 이름이 없으면 `_names`도 지운다. */
const removeFieldName = (node: WorkflowNodeDto, field: NodeCatalogInputField) => {
	const namesPath = getNamesPath(field)
	const next = deleteAtPath(node, `${namesPath}.${field.key}`)
	const names = getAtPath(next, namesPath)
	return names && typeof names === 'object' && Object.keys(names).length === 0 ? deleteAtPath(next, namesPath) : next
}

/** 설정 폼 칸에 저장된 표시 이름. 직접 입력·참조식 값에는 없다. */
export const getFieldName = (node: WorkflowNodeDto, field: NodeCatalogInputField) => {
	const name = getAtPath(node, `${getNamesPath(field)}.${field.key}`)
	return typeof name === 'string' ? name : undefined
}

/**
 * 칸 값을 바꾼 새 노드를 돌려준다. `value`가 `undefined`면 키를 지운다(비움).
 * `name`은 드롭다운에서 고른 항목의 표시 이름이며 `_names`에 저장한다. 직접 입력한 값에는 넘기지 않는다.
 * 이전 표시 이름과, `optionsInputs`로 이 칸에 연쇄된 자식 칸의 값·표시 이름도 함께 지운다.
 * 폼에 없는 config 키는 그대로 둔다.
 */
export const updateNodeField = (
	node: WorkflowNodeDto,
	entry: NodeCatalogEntry,
	field: NodeCatalogInputField,
	value: unknown,
	name?: string
): WorkflowNodeDto => {
	let next = value === undefined ? deleteAtPath(node, field.path) : setAtPath(node, field.path, value)
	next = removeFieldName(next, field)
	if (value !== undefined && name !== undefined) next = setAtPath(next, `${getNamesPath(field)}.${field.key}`, name)
	for (const child of entry.inputFields) {
		if (!child.optionsInputs?.includes(field.key)) continue
		next = removeFieldName(deleteAtPath(next, child.path), child)
	}
	return next
}
