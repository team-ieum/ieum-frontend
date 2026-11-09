import type { NodeOption, NodeOptionNames } from '@/types/nodeOptions'

/** 목록 칸에 저장할 값과 표시 이름. 값이 `undefined`면 칸 키를 지운다(비움). */
type NodeOptionListChange = {
	value: string[] | undefined
	names: NodeOptionNames | undefined
}

/**
 * 목록 칸에 저장된 값을 id 목록으로 읽는다.
 * 실행(agent)은 쉼표 구분 문자열도 목록으로 받으므로 문자열은 쉼표로 나눠 보여 준다. 빈 항목과 중복은 뺀다.
 */
export const readOptionListIds = (value: unknown): string[] => {
	if (value === undefined || value === null) return []
	const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [value]
	const ids = items.map(item => String(item).trim()).filter(Boolean)
	return [...new Set(ids)]
}

const pickNames = (ids: string[], names: NodeOptionNames | undefined): NodeOptionNames | undefined => {
	const entries = ids.flatMap(id => (names?.[id] ? [[id, names[id]] as const] : []))
	return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

/** 고른 항목을 목록 끝에 더한다. 이미 있으면 그대로 둔다. 표시 이름은 남은 id 것만 남긴다. */
export const addOptionListItem = (
	ids: string[],
	names: NodeOptionNames | undefined,
	option: NodeOption
): NodeOptionListChange => {
	const nextIds = ids.includes(option.id) ? ids : [...ids, option.id]
	const nextNames = option.name ? { ...names, [option.id]: option.name } : names
	return { value: nextIds, names: pickNames(nextIds, nextNames) }
}

/** 항목 하나를 뺀다. 마지막 항목을 빼면 값과 표시 이름을 모두 지운다. */
export const removeOptionListItem = (ids: string[], names: NodeOptionNames | undefined, id: string): NodeOptionListChange => {
	const nextIds = ids.filter(item => item !== id)
	if (nextIds.length === 0) return { value: undefined, names: undefined }
	return { value: nextIds, names: pickNames(nextIds, names) }
}
