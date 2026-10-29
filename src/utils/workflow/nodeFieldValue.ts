import type { NodeCatalogEntry, NodeCatalogInputField } from '@/types/nodeCatalog'
import type { WorkflowNodeDto } from '@/types/workflowList'
import { getAtPath } from '@/utils/workflow/objectPath'

/**
 * 설정 폼 칸의 입력 방식. 비움은 값이 없는 상태(키 삭제)라 따로 두지 않는다.
 * - `fixed`: 칸 type에 맞는 위젯으로 값을 고른다.
 * - `reference`: `{{nodes.<id>.output.<field>}}` 참조식 문자열을 입력한다.
 */
export type NodeFieldMode = 'fixed' | 'reference'

export type NodeFieldParseResult =
	| { ok: true; value: unknown }
	/** `rejected`면 입력 자체를 받지 않는다(입력 칸에 남기지 않음). */
	| { ok: false; error: string; rejected?: boolean }

const REFERENCE_MARK = '{{'
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const containsReference = (value: unknown) => typeof value === 'string' && value.includes(REFERENCE_MARK)

const canUseReference = (field: NodeCatalogInputField) => field.ref !== false

/** 0-D 폼이 편집하는 칸인지. object 목록(AI 도구 등)은 전용 편집기 전까지 값을 보존만 한다. */
export const isFieldEditable = (field: NodeCatalogInputField) => field.type !== 'object'

/** 참조식을 위젯과 같은 입력 칸에 바로 쓰는 칸인지. 그 밖의 칸은 값·참조식 입력 방식을 나눠 고른다. */
const isPlainTextField = (field: NodeCatalogInputField) =>
	(field.type === 'string' || field.type === 'text') && !field.choices && !field.list

export const hasReferenceMode = (field: NodeCatalogInputField) =>
	canUseReference(field) && isFieldEditable(field) && !isPlainTextField(field)

/** 키 없음·`null`·빈 문자열·빈 배열·빈 객체를 비운 값으로 본다. */
export const isEmptyFieldValue = (value: unknown) => {
	if (value === undefined || value === null) return true
	if (typeof value === 'string') return value.trim() === ''
	if (Array.isArray(value)) return value.length === 0
	if (typeof value === 'object') return Object.keys(value).length === 0
	return false
}

// json처럼 값 안에 참조식을 섞어 쓰는 칸이 있어 값 전체가 참조식 하나일 때만 참조식 방식으로 본다.
const WHOLE_REFERENCE_PATTERN = /^\s*\{\{[^{}]*\}\}\s*$/

export const getInitialFieldMode = (field: NodeCatalogInputField, value: unknown): NodeFieldMode =>
	hasReferenceMode(field) && typeof value === 'string' && WHOLE_REFERENCE_PATTERN.test(value) ? 'reference' : 'fixed'

/** 기본값이 없는 필수 칸이 비었는지. 기본값이 있으면 비워도 서버가 그 값을 쓴다. */
export const isRequiredFieldMissing = (field: NodeCatalogInputField, value: unknown) =>
	field.required === true && field.default === undefined && isEmptyFieldValue(value)

/** 폼에서 채울 수 있는 칸 중 비어 있는 필수 칸 목록. */
export const getMissingRequiredFields = (entry: NodeCatalogEntry, node: WorkflowNodeDto) =>
	entry.inputFields.filter(field => isFieldEditable(field) && isRequiredFieldMissing(field, getAtPath(node, field.path)))

/** 저장된 값을 입력 칸 문자열로 바꾼다. 목록은 한 줄에 하나, 객체는 JSON으로 보여 준다. */
export const formatFieldDraft = (value: unknown): string => {
	if (value === undefined || value === null) return ''
	if (typeof value === 'string') return value
	if (Array.isArray(value) && value.every(item => typeof item !== 'object' || item === null)) return value.join('\n')
	if (typeof value === 'object') return JSON.stringify(value, null, 2)
	return String(value)
}

const parseScalar = (field: NodeCatalogInputField, text: string): NodeFieldParseResult => {
	if (field.type === 'integer') {
		const value = Number(text)
		return /^-?\d+$/.test(text) && Number.isSafeInteger(value)
			? { ok: true, value }
			: { ok: false, error: '정수를 입력해 주세요.' }
	}
	if (field.type === 'number') {
		const value = Number(text)
		return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: '숫자를 입력해 주세요.' }
	}
	if (field.type === 'cron') {
		const parts = text.split(/\s+/)
		return parts.length === 5
			? { ok: true, value: parts.join(' ') }
			: { ok: false, error: '분 시 일 월 요일 5칸을 공백으로 나눠 입력해 주세요.' }
	}
	if (field.type === 'datetime') {
		// datetime-local 입력은 초가 없어 ISO 8601 초 단위까지 맞춰 저장한다.
		if (LOCAL_DATETIME_PATTERN.test(text)) return { ok: true, value: `${text}:00` }
		return Number.isNaN(Date.parse(text))
			? { ok: false, error: '날짜와 시간을 2026-01-31T09:00:00 형식으로 입력해 주세요.' }
			: { ok: true, value: text }
	}
	if (field.type === 'json') {
		// json 칸은 객체가 아니라 파싱을 확인한 JSON 문자열로 저장한다.
		try {
			JSON.parse(text)
			return { ok: true, value: text }
		} catch {
			return { ok: false, error: 'JSON 형식이 올바르지 않아요.' }
		}
	}
	return { ok: true, value: text }
}

/**
 * 입력 칸 문자열을 저장할 값으로 바꾼다. 빈 입력은 `value: undefined`(키 삭제)다.
 * 참조식 방식은 `{{`가 있는 문자열만 받고, 참조식을 쓸 수 없는 칸은 `{{` 입력을 거부한다.
 */
export const parseFieldInput = (field: NodeCatalogInputField, text: string, mode: NodeFieldMode): NodeFieldParseResult => {
	if (!canUseReference(field) && text.includes(REFERENCE_MARK)) {
		return { ok: false, error: '이 칸에는 참조식을 쓸 수 없어요.', rejected: true }
	}
	if (mode === 'reference') {
		if (text.trim() === '') return { ok: true, value: undefined }
		return containsReference(text)
			? { ok: true, value: text }
			: { ok: false, error: '참조식은 {{nodes.노드ID.output.필드}} 형식으로 입력해 주세요.' }
	}
	// 문자열 칸은 앞뒤 공백도 값이므로 그대로 두고, 나머지 type은 공백을 지운 뒤 해석한다.
	if (isPlainTextField(field)) return { ok: true, value: text.trim() === '' ? undefined : text }

	if (field.list) {
		const results = text
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
			.map(line => parseScalar(field, line))
		const failed = results.find(result => !result.ok)
		if (failed) return failed
		const values = results.map(result => (result.ok ? result.value : undefined))
		return { ok: true, value: values.length > 0 ? values : undefined }
	}

	const trimmed = text.trim()
	return trimmed === '' ? { ok: true, value: undefined } : parseScalar(field, trimmed)
}
