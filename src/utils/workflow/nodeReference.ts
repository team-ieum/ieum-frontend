/**
 * 출력 참조식 `{{nodes.<NODE_ID>.output.<FIELD_PATH>}}`의 형식·해석·삽입.
 * NODE_ID는 영숫자와 `-`, FIELD_PATH는 영숫자와 `_`로 된 세그먼트를 `.`으로 이은 값만 참조할 수 있다(FE-51 명세).
 */
import type { NodeReference } from '@/types/nodeReference'

const NODE_ID_PATTERN = /^[A-Za-z0-9-]+$/
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_]+$/
// 문제를 알리려고 규칙에 어긋난 id·경로도 일단 잡고, 규칙 검사는 사용처가 한다.
// 서버가 중괄호 안 앞뒤 공백을 받는지는 확인하지 않아, 공백이 있어도 참조식으로 본다.
const REFERENCE_PATTERN = /\{\{\s*nodes\.([^.{}\s]+)\.output\.([^{}\s]+?)\s*\}\}/g

export type TextSelection = { start: number; end: number }

/** 커서 앞에서 쓰는 중인 참조식. `start`~`end`가 고른 참조식으로 바꿀 범위다. */
export type ReferenceQuery = TextSelection & {
	/** `{{` 뒤에 입력한 문자열 */
	query: string
}

// 공백이나 중괄호가 나오면 참조식 입력이 끝난 것으로 본다.
const OPEN_REFERENCE_PATTERN = /\{\{([^{}\s]*)$/
const CLOSE_MARK = '}}'

export const isReferenceableNodeId = (nodeId: string) => NODE_ID_PATTERN.test(nodeId)

export const isReferenceablePathSegment = (segment: string) => PATH_SEGMENT_PATTERN.test(segment)

export const formatNodeReference = (nodeId: string, path: string) => `{{nodes.${nodeId}.output.${path}}}`

/** 텍스트에 섞인 출력 참조식을 모두 찾는다. `nodes.`로 시작하지 않는 `{{…}}`는 다른 템플릿일 수 있어 건너뛴다. */
export const parseNodeReferences = (text: string): NodeReference[] =>
	[...text.matchAll(REFERENCE_PATTERN)].map(match => ({
		nodeId: match[1],
		path: match[2],
		start: match.index,
		end: match.index + match[0].length,
	}))

/** 값 안의 모든 문자열(배열·객체 안 포함)에서 출력 참조식을 찾는다. 노드 config 전체나 칸 값 하나에 쓴다. */
export const collectNodeReferences = (value: unknown): NodeReference[] => {
	if (typeof value === 'string') return parseNodeReferences(value)
	if (Array.isArray(value)) return value.flatMap(collectNodeReferences)
	if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(collectNodeReferences)
	return []
}

/** 선택 영역을 `insert`로 바꾼 텍스트와, 넣은 글자 바로 뒤의 커서 위치를 돌려준다. */
export const insertTextAtSelection = (text: string, selection: TextSelection, insert: string) => {
	const start = Math.min(Math.max(selection.start, 0), text.length)
	const end = Math.min(Math.max(selection.end, start), text.length)
	return { text: text.slice(0, start) + insert + text.slice(end), caret: start + insert.length }
}

/**
 * 커서 바로 앞이 `{{` + 공백·중괄호 없는 문자열이면 쓰는 중인 참조식 범위를 돌려준다. 아니면 `null`이다.
 * 커서 바로 뒤에 `}}`가 있으면 범위에 포함해, 고른 참조식으로 바꿀 때 닫는 괄호가 겹치지 않게 한다.
 */
export const findReferenceQuery = (text: string, caret: number): ReferenceQuery | null => {
	const match = OPEN_REFERENCE_PATTERN.exec(text.slice(0, caret))
	if (!match) return null
	const end = text.startsWith(CLOSE_MARK, caret) ? caret + CLOSE_MARK.length : caret
	return { start: match.index, end, query: match[1] }
}
