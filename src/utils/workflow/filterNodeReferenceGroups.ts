import type { NodeReferenceGroup, NodeReferenceOption } from '@/types/nodeReference'

const matchesQuery = (group: NodeReferenceGroup, option: NodeReferenceOption, query: string) =>
	[option.expression, option.title, group.label].some(text => text.toLowerCase().includes(query))

/**
 * `{{` 뒤에 입력한 질의로 참조 후보를 거른다. 참조식(`nodes.<id>.output.<path>`), 출력 이름, 노드 라벨 중 하나에
 * 대소문자 구분 없이 들어 있으면 남긴다. 질의가 비면 상태 안내를 보여 주도록 그룹을 그대로 두고,
 * 질의가 있으면 맞는 후보가 없는 그룹(불러오는 중·샘플 없음 포함)은 뺀다.
 */
export const filterNodeReferenceGroups = (groups: NodeReferenceGroup[], query: string): NodeReferenceGroup[] => {
	const normalized = query.trim().toLowerCase()
	if (!normalized) return groups
	return groups
		.map(group => ({ ...group, options: group.options.filter(option => matchesQuery(group, option, normalized)) }))
		.filter(group => group.options.length > 0)
}
