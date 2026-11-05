import type { NodeCatalogEntry, NodeCatalogField } from '@/types/nodeCatalog'
import type { NodeOutputPath } from '@/types/nodeReference'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { readAiOutputFieldRows } from '@/utils/workflow/aiOutputFields'
import { isReferenceablePathSegment } from '@/utils/workflow/nodeReference'
import { getAtPath } from '@/utils/workflow/objectPath'

// 카탈로그 `outputsFrom`이 가리킬 수 있는 config 경로(FE-57 ②).
const OUTPUT_FIELDS_SOURCE = 'config.outputFields'
const MAPPINGS_SOURCE = 'config.mappings'
const TITLE_SEPARATOR = ' › '
const FIRST_ITEM_TITLE = '첫 항목'
// 샘플이 큰 객체여도 목록이 지나치게 길어지지 않게 깊이와 개수를 자른다.
const MAX_SAMPLE_DEPTH = 4
const MAX_SAMPLE_PATHS = 50

type GetNodeOutputPathsOptions = {
	node: WorkflowNodeDto
	/** 노드 event의 카탈로그 항목. 없으면(카탈로그 밖 노드) 경로를 만들 수 없다. */
	entry?: NodeCatalogEntry
	/** 동적 출력 노드의 최신 성공 샘플 출력 */
	sampleOutput?: Record<string, unknown>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const joinPath = (prefix: string, key: string) => (prefix ? `${prefix}.${key}` : key)

const joinTitle = (prefix: string, title: string) => (prefix ? `${prefix}${TITLE_SEPARATOR}${title}` : title)

/** 출력 칸 하나를 명세의 제시 규칙대로 경로로 펼친다. 목록은 첫 항목 경로만 만든다. */
const toFieldPaths = (field: NodeCatalogField, pathPrefix = '', titlePrefix = ''): NodeOutputPath[] => {
	if (!isReferenceablePathSegment(field.key)) return []
	const path = joinPath(pathPrefix, field.key)
	const title = joinTitle(titlePrefix, field.title || field.key)
	if (field.dynamic) return [{ path, title, isOpenEnded: true }]

	const children = field.children ?? []
	if (field.list) {
		const itemPath = `${path}.0`
		const itemTitle = joinTitle(title, FIRST_ITEM_TITLE)
		const itemPaths =
			children.length > 0
				? children.flatMap(child => toFieldPaths(child, itemPath, itemTitle))
				: [{ path: itemPath, title: itemTitle }]
		return [{ path, title }, ...itemPaths]
	}
	return children.length > 0 ? children.flatMap(child => toFieldPaths(child, path, title)) : [{ path, title }]
}

const toSamplePaths = (value: unknown, path: string, title: string, depth: number): NodeOutputPath[] => {
	if (Array.isArray(value)) {
		const itemPath = `${path}.0`
		const itemTitle = joinTitle(title, FIRST_ITEM_TITLE)
		const first: unknown = value[0]
		const itemPaths =
			isPlainObject(first) && depth < MAX_SAMPLE_DEPTH
				? toSampleObjectPaths(first, itemPath, itemTitle, depth + 1)
				: [{ path: itemPath, title: itemTitle }]
		return [{ path, title }, ...itemPaths]
	}
	if (isPlainObject(value) && depth < MAX_SAMPLE_DEPTH && Object.keys(value).length > 0) {
		return toSampleObjectPaths(value, path, title, depth + 1)
	}
	return [{ path, title }]
}

const toSampleObjectPaths = (value: Record<string, unknown>, pathPrefix: string, titlePrefix: string, depth: number) =>
	Object.entries(value)
		.filter(([key]) => isReferenceablePathSegment(key))
		.flatMap(([key, child]) => toSamplePaths(child, joinPath(pathPrefix, key), joinTitle(titlePrefix, key), depth))

/**
 * `outputsFrom`이 가리키는 config 값으로 출력 칸 목록을 만든다. 값이 비면 정적 `outputFields`를 쓴다.
 * - `config.outputFields`(`ai.reasoning`): 선언한 출력 칸이 출력 전체를 대체한다(정적 칸과 합치지 않음).
 * - `config.mappings`(`transform.map`): mappings의 키가 출력 칸이다.
 */
const resolveOutputFields = (node: WorkflowNodeDto, entry: NodeCatalogEntry): NodeCatalogField[] => {
	if (entry.outputsFrom === OUTPUT_FIELDS_SOURCE) {
		// 중복 이름은 출력 칸 편집기가 오류로 알리지만 저장은 되므로, 같은 경로를 한 번만 제시한다.
		const keys = [
			...new Set((readAiOutputFieldRows(getAtPath(node, entry.outputsFrom)) ?? []).map(row => row.key).filter(Boolean)),
		]
		if (keys.length > 0) return keys.map(key => ({ key, title: key, type: 'string' }))
	}
	if (entry.outputsFrom === MAPPINGS_SOURCE) {
		const mappings = getAtPath(node, entry.outputsFrom)
		const keys = isPlainObject(mappings) ? Object.keys(mappings) : []
		if (keys.length > 0) return keys.map(key => ({ key, title: key, type: 'string' }))
	}
	// 그 밖의 outputsFrom 값은 해석 규칙이 정해지지 않아 정적 outputFields로 둔다.
	return entry.outputFields
}

/** 경로를 계산할 수 있는 노드인지. 동적 출력 노드와 카탈로그 밖 노드는 출력 모양을 미리 알 수 없다. */
export const hasKnownOutputPaths = (entry: NodeCatalogEntry | undefined): entry is NodeCatalogEntry =>
	Boolean(entry && !entry.outputDynamic)

/**
 * 노드 출력에서 참조할 수 있는 경로 목록. 카탈로그 `outputFields`와 `outputsFrom`으로 만들고,
 * 동적 출력 노드(`outputDynamic`)는 `outputFields`가 비어 있어 테스트 샘플 출력으로 만든다.
 * 참조식 규칙에 어긋나는 key는 참조할 수 없어 뺀다.
 */
export const getNodeOutputPaths = ({ node, entry, sampleOutput }: GetNodeOutputPathsOptions): NodeOutputPath[] => {
	if (!entry) return []
	if (entry.outputDynamic) {
		return sampleOutput ? toSampleObjectPaths(sampleOutput, '', '', 1).slice(0, MAX_SAMPLE_PATHS) : []
	}
	return resolveOutputFields(node, entry).flatMap(field => toFieldPaths(field))
}
