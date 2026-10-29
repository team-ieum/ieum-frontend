import { useState } from 'react'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import {
	formatFieldDraft,
	getInitialFieldMode,
	isEmptyFieldValue,
	parseFieldInput,
	type NodeFieldMode,
} from '@/utils/workflow/nodeFieldValue'

type UseNodeSettingsFieldOptions = {
	field: NodeCatalogInputField
	value: unknown
	/** 저장할 값을 넘긴다. `undefined`는 키 삭제(비움)다. */
	onChange: (value: unknown) => void
}

/**
 * 설정 폼 한 칸의 입력 방식·입력 중 문자열·오류를 관리한다.
 * 입력 문자열은 해석에 성공할 때만 `onChange`로 넘겨, 잘못된 값이 편집 문서에 들어가지 않게 한다.
 * 이 칸이 넘기지 않은 값(연쇄 비우기, 채팅 반영 등)이 들어오면 칸 상태를 그 값으로 다시 맞춘다.
 */
export const useNodeSettingsField = ({ field, value, onChange }: UseNodeSettingsFieldOptions) => {
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

	const emit = (next: unknown) => {
		setSyncedValue(next)
		onChange(next)
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

	/** 선택 상자처럼 해석이 필요 없는 위젯의 값을 바로 넘긴다. */
	const changeValue = (next: unknown) => {
		setError(null)
		emit(next)
	}

	// 값과 참조식은 서로 다른 모양이라 방식을 바꾸면 이전 값을 비운다.
	const changeMode = (next: NodeFieldMode) => {
		if (next === mode) return
		setMode(next)
		setDraft('')
		setError(null)
		if (!isEmptyFieldValue(value)) emit(undefined)
	}

	return { mode, changeMode, draft, changeText, changeValue, error }
}
