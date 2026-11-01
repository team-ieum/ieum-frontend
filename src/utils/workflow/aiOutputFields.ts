/**
 * AI 노드 출력 칸(`config.outputFields`)의 규칙·읽기·쓰기.
 * 출력 칸을 선언하면 AI 노드 출력이 `{output}` 대신 그 칸들의 객체가 된다.
 * 규칙은 실행할 때 칸을 거부하는 ieum-agent `core/output_fields.py`의 `validate_output_fields`와 맞춘다.
 * 서버는 저장할 때 검사하지 않고 실행할 때만 `INVALID_OUTPUT_FIELDS`로 실패하므로, 여기 검사는 미리 알리는 용도다.
 */
import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { deleteAtPath, getAtPath } from '@/utils/workflow/objectPath'

export const MAX_AI_OUTPUT_FIELDS = 20
export const MAX_AI_OUTPUT_FIELD_DESCRIPTION = 500

// 참조식 경로로 읽을 수 있는 이름만 허용한다. 점은 경로 구분자라 쓸 수 없다.
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const RESERVED_KEYS = new Set(['success', 'error'])
// 서버가 이 말이 든 키의 값을 ***로 가려 저장해서 아래 노드에 가려진 값이 흘러간다.
const SENSITIVE_KEY_PARTS = ['apikey', 'api_key', 'token', 'secret', 'password', 'authorization']
const ITEM_ATTRIBUTES = new Set(['key', 'type', 'description'])

// agent는 노드 event와 상관없이 이 경로를 읽는다. 카탈로그에 출력 칸이 없는 `ai.agent`에서도 이 경로로 확인한다.
const OUTPUT_FIELDS_PATH = 'config.outputFields'

const DEFAULT_LABELS = { key: '이름', type: '타입', description: '설명' }
// 출력 칸 type과 카탈로그 children이 없을 때 쓸 선택지. 검사도 이 목록을 기준으로 한다.
const DEFAULT_TYPE_CHOICES = [
	{ id: 'text', name: '텍스트' },
	{ id: 'number', name: '숫자' },
	{ id: 'boolean', name: '참/거짓' },
]
const AI_OUTPUT_FIELD_TYPES = DEFAULT_TYPE_CHOICES.map(choice => choice.id)

/** 편집기 한 행. 저장된 원소를 그대로 읽으며 규칙에 어긋난 값도 고치지 않는다. 비운 type은 빈 문자열이다. */
export type AiOutputFieldRow = { key: string; type: string; description: string }

/** 한 행의 속성별 오류 문구. `item`은 원소 자체의 형식 오류다. */
export type AiOutputFieldErrors = Partial<Record<keyof AiOutputFieldRow | 'item', string>>

export type AiOutputFieldsValidation = {
	/** 목록 전체의 오류(목록이 아님, 개수 초과). */
	listError?: string
	/** 원소와 같은 순서의 행별 오류. 오류가 없는 행은 빈 객체다. */
	rowErrors: AiOutputFieldErrors[]
	/** 고쳐야 할 곳의 수. 목록 오류 1곳 + 오류가 있는 행 수다. */
	issueCount: number
}

/**
 * 카탈로그 항목에서 출력 칸 입력 칸을 찾는다.
 * `outputsFrom`이 가리키는 object 목록 칸이며, 없으면 `undefined`다(`transform.map`의 dict 칸은 해당하지 않음).
 */
export const findAiOutputFieldsField = (entry: NodeCatalogEntry): NodeCatalogInputField | undefined =>
	entry.outputsFrom
		? entry.inputFields.find(field => field.path === entry.outputsFrom && field.type === 'object' && field.list)
		: undefined

/** 카탈로그 `children`의 제목과 type 선택지. 실서버 카탈로그에 없으면 기본 문구를 쓴다. */
export const getAiOutputFieldLabels = (field: NodeCatalogInputField) => {
	const findChild = (key: keyof AiOutputFieldRow) => field.children?.find(child => child.key === key)
	return {
		key: findChild('key')?.title || DEFAULT_LABELS.key,
		type: findChild('type')?.title || DEFAULT_LABELS.type,
		description: findChild('description')?.title || DEFAULT_LABELS.description,
		typeChoices: findChild('type')?.choices ?? DEFAULT_TYPE_CHOICES,
	}
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const readText = (value: unknown) => (typeof value === 'string' ? value : '')

/** 저장된 값을 편집기 행으로 읽는다. 값이 없으면 빈 목록, 목록이 아니면 `undefined`(편집 불가)다. */
export const readAiOutputFieldRows = (value: unknown): AiOutputFieldRow[] | undefined => {
	if (value === undefined || value === null) return []
	if (!Array.isArray(value)) return undefined
	return value.map(item =>
		isPlainObject(item)
			? { key: readText(item.key), type: readText(item.type), description: readText(item.description) }
			: { key: '', type: '', description: '' }
	)
}

/**
 * 편집기 행을 저장할 값으로 바꾼다. 원소에는 key·type·description만 담고, 비운 type·description은 키를 뺀다.
 * 행이 없으면 `undefined`이며, 이때 칸 키를 지워 출력이 기본 `{output}`으로 돌아간다.
 */
export const toAiOutputFieldsValue = (rows: AiOutputFieldRow[]) =>
	rows.length > 0
		? rows.map(({ key, type, description }) => ({ key, ...(type ? { type } : {}), ...(description ? { description } : {}) }))
		: undefined

/** 서버(Python `len`)와 같게 코드 포인트 단위로 센 설명 글자 수. */
export const countDescriptionLength = (description: string) => [...description].length

const getKeyError = (key: unknown, seenKeys: Set<string>) => {
	if (typeof key !== 'string' || key === '') return '이름을 입력하세요.'
	if (!KEY_PATTERN.test(key)) return '이름은 영문·숫자·밑줄만 쓰고 영문이나 밑줄로 시작해요(64자 이하).'
	if (seenKeys.has(key)) return '같은 이름의 칸이 이미 있어요.'
	if (RESERVED_KEYS.has(key)) return `'${key}'는 예약된 이름이라 쓸 수 없어요.`
	const lowerKey = key.toLowerCase()
	if (SENSITIVE_KEY_PARTS.some(part => lowerKey.includes(part))) {
		return '민감정보로 보이는 이름이라 실행 결과에서 값이 가려져요. 다른 이름을 쓰세요.'
	}
	return undefined
}

const getItemErrors = (item: unknown, seenKeys: Set<string>): AiOutputFieldErrors => {
	if (!isPlainObject(item)) {
		return {
			item: '알 수 없는 형식이라 빈 칸으로 보여요. 다른 출력 칸을 고쳐도 빈 칸으로 저장되니 지우거나 다시 채워 주세요.',
		}
	}
	const errors: AiOutputFieldErrors = {}
	const unknownAttributes = Object.keys(item).filter(attribute => !ITEM_ATTRIBUTES.has(attribute))
	if (unknownAttributes.length > 0) {
		errors.item = `알 수 없는 속성(${unknownAttributes.join(', ')})이 있어요. 출력 칸을 하나라도 고치면 사라져요.`
	}
	const keyError = getKeyError(item.key, seenKeys)
	if (keyError) errors.key = keyError
	if (typeof item.type !== 'string' || !AI_OUTPUT_FIELD_TYPES.includes(item.type)) errors.type = '타입을 고르세요.'
	const { description } = item
	if (description !== undefined && description !== null) {
		// 문자열이 아닌 설명은 편집기에서 빈 칸으로 보여 길이 문구 대신 형식 문구를 쓴다.
		if (typeof description !== 'string') errors.description = '설명은 글자로만 쓸 수 있어요. 다시 입력해 주세요.'
		else if (countDescriptionLength(description) > MAX_AI_OUTPUT_FIELD_DESCRIPTION) {
			errors.description = `설명은 ${MAX_AI_OUTPUT_FIELD_DESCRIPTION}자까지 쓸 수 있어요.`
		}
	}
	return errors
}

/**
 * 저장된 출력 칸 값을 실행 규칙으로 검사한다. 값이 없거나 빈 목록이면 오류가 없다.
 * 이름이 겹치면 두 번째 칸부터 오류로 본다.
 */
export const validateAiOutputFields = (value: unknown): AiOutputFieldsValidation => {
	if (value === undefined || value === null) return { rowErrors: [], issueCount: 0 }
	if (!Array.isArray(value)) {
		return { listError: '출력 칸 값을 읽을 수 없어요. 비우고 다시 만들어 주세요.', rowErrors: [], issueCount: 1 }
	}
	const seenKeys = new Set<string>()
	const rowErrors = value.map(item => {
		const errors = getItemErrors(item, seenKeys)
		if (isPlainObject(item) && typeof item.key === 'string') seenKeys.add(item.key)
		return errors
	})
	const listError =
		value.length > MAX_AI_OUTPUT_FIELDS
			? `출력 칸은 ${MAX_AI_OUTPUT_FIELDS}개까지 쓸 수 있어요. ${value.length - MAX_AI_OUTPUT_FIELDS}개를 지워 주세요.`
			: undefined
	const invalidRowCount = rowErrors.filter(errors => Object.keys(errors).length > 0).length
	return { listError, rowErrors, issueCount: invalidRowCount + (listError ? 1 : 0) }
}

/** 노드에 출력 칸 값이 남아 있는지. 빈 목록은 기본 칸이라 없는 것으로 본다. 도구를 쓰는 AI 노드는 이 값이 있으면 실행되지 않는다. */
export const hasAiOutputFields = (node: WorkflowNodeDto) => {
	const value = getAtPath(node, OUTPUT_FIELDS_PATH)
	return value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0)
}

/** 출력 칸 값을 지운 새 노드를 돌려준다. 다른 config 키는 그대로 둔다. */
export const clearAiOutputFields = (node: WorkflowNodeDto) => deleteAtPath(node, OUTPUT_FIELDS_PATH)
