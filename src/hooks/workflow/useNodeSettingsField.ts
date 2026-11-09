import { useState } from 'react'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeFieldName } from '@/types/nodeOptions'
import type { NodeReferenceContext } from '@/types/nodeReference'
import { findNodeReferenceIssues, getNodeReferenceIssueMessage } from '@/utils/workflow/findNodeReferenceIssues'
import {
	formatFieldDraft,
	getInitialFieldMode,
	getReferencePickerTarget,
	isEmptyFieldValue,
	parseFieldInput,
	type NodeFieldMode,
} from '@/utils/workflow/nodeFieldValue'
import { collectNodeReferences, insertTextAtSelection, type TextSelection } from '@/utils/workflow/nodeReference'

type UseNodeSettingsFieldOptions = {
	field: NodeCatalogInputField
	value: unknown
	/** 저장할 값을 넘긴다. `undefined`는 키 삭제(비움)다. `name`은 목록에서 고른 항목의 표시 이름이다. */
	onChange: (value: unknown, name?: NodeFieldName) => void
	/** 목록 공급원 드롭다운으로 그리는 칸인지. 직접 입력이 없어 참조 피커를 쓰지 않는다. */
	isOptionsCombobox: boolean
	/** 참조 검사 문맥. 없으면 참조 경고를 만들지 않는다. */
	referenceContext?: NodeReferenceContext
}

const getReferenceWarning = (value: unknown, context: NodeReferenceContext | undefined) => {
	if (!context) return null
	const issues = findNodeReferenceIssues(collectNodeReferences(value), context)
	if (issues.length === 0) return null
	const more = issues.length > 1 ? ` 외 ${issues.length - 1}곳` : ''
	return `${getNodeReferenceIssueMessage(issues[0])}${more} 참조를 확인해 주세요.`
}

/**
 * 설정 폼 한 칸의 입력 방식·입력 중 문자열·오류를 관리한다.
 * 입력 문자열은 해석에 성공할 때만 `onChange`로 넘겨, 잘못된 값이 편집 문서에 들어가지 않게 한다.
 * 이 칸이 넘기지 않은 값(연쇄 비우기, 채팅 반영 등)이 들어오면 칸 상태를 그 값으로 다시 맞춘다.
 * 출력 참조 피커로 고른 참조식을 넣는 방식과, 값의 참조식이 가리키는 노드·경로 문제 경고도 함께 만든다.
 */
export const useNodeSettingsField = ({
	field,
	value,
	onChange,
	isOptionsCombobox,
	referenceContext,
}: UseNodeSettingsFieldOptions) => {
	const [mode, setMode] = useState<NodeFieldMode>(() => getInitialFieldMode(field, value))
	const [draft, setDraft] = useState(() => formatFieldDraft(value))
	const [error, setError] = useState<string | null>(null)
	// 입력 중 문자열과 맞는 마지막 값. 직접 넘긴 값은 path로 다시 읽어도 같은 참조라 바뀌지 않은 것으로 본다.
	const [syncedValue, setSyncedValue] = useState(value)

	if (value !== syncedValue) {
		setSyncedValue(value)
		setMode(getInitialFieldMode(field, value))
		setDraft(formatFieldDraft(value))
		setError(null)
	}

	const emit = (next: unknown, name?: NodeFieldName) => {
		setSyncedValue(next)
		onChange(next, name)
	}

	const changeText = (text: string) => {
		const result = parseFieldInput(field, text, mode)
		if (!result.ok) {
			setError(result.error)
			if (!result.rejected) setDraft(text)
			return
		}
		setDraft(text)
		setError(null)
		emit(result.value)
	}

	/** 선택 상자·드롭다운처럼 해석이 필요 없는 위젯의 값을 바로 넘긴다. */
	const changeValue = (next: unknown, name?: NodeFieldName) => {
		setError(null)
		emit(next, name)
	}

	// 값과 참조식은 서로 다른 모양이라 방식을 바꾸면 이전 값을 비운다.
	const changeMode = (next: NodeFieldMode) => {
		if (next === mode) return
		setMode(next)
		setDraft('')
		setError(null)
		if (!isEmptyFieldValue(value)) emit(undefined)
	}

	const pickerTarget = getReferencePickerTarget(field, mode, isOptionsCombobox)

	/**
	 * 고른 참조식을 칸에 넣고, 넣은 참조식 바로 뒤의 커서 위치를 돌려준다.
	 * `selection`이 없으면(칸에 커서를 둔 적 없음) 입력 끝에 넣는다.
	 */
	const insertReference = (expression: string, selection?: TextSelection): number | undefined => {
		if (pickerTarget === 'none') return undefined
		// 빈 json 칸에 참조식만 넣으면 JSON으로 해석되지 않아 저장되지 않으므로, 값 방식 칸처럼 참조식 방식으로 바꾼다.
		const isEmptyJson = field.type === 'json' && mode === 'fixed' && draft.trim() === ''
		if (pickerTarget === 'replace' || isEmptyJson) {
			setMode('reference')
			setDraft(expression)
			setError(null)
			emit(expression)
			return expression.length
		}
		const inserted = insertTextAtSelection(draft, selection ?? { start: draft.length, end: draft.length }, expression)
		changeText(inserted.text)
		return inserted.caret
	}

	return {
		mode,
		changeMode,
		draft,
		changeText,
		changeValue,
		error,
		pickerTarget,
		insertReference,
		referenceWarning: getReferenceWarning(value, referenceContext),
	}
}
