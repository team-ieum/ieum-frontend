import { useState, type KeyboardEvent } from 'react'
import type { NodeReferenceGroup, NodeReferenceOption } from '@/types/nodeReference'
import { filterNodeReferenceGroups } from '@/utils/workflow/filterNodeReferenceGroups'
import { findReferenceQuery, type ReferenceQuery } from '@/utils/workflow/nodeReference'

type UseNodeReferenceAutocompleteOptions = {
	/** 참조 후보 그룹. 없으면 자동완성을 열지 않는다. */
	groups: NodeReferenceGroup[] | undefined
	/** 고른 참조식과 바꿀 범위(`{{질의`, 닫힌 참조식이면 `}}`까지)를 넘긴다. 칸에 넣는 일은 받는 쪽이 맡는다. */
	onChoose: (expression: string, range: ReferenceQuery) => void
}

type UseNodeReferenceAutocompleteResult = {
	isOpen: boolean
	/** 질의로 거른 후보 그룹 */
	groups: NodeReferenceGroup[]
	/** 후보 그룹은 있는데 질의와 맞는 후보가 없는지 */
	hasNoMatch: boolean
	optionCount: number
	activeIndex: number
	setActiveIndex: (index: number) => void
	/** 입력 값이나 커서가 바뀔 때 부른다. 커서 앞이 `{{…`이면 열고 아니면 닫는다. */
	handleCaretChange: (text: string, caret: number | null) => void
	/** 입력 칸 keydown. 목록이 열려 있을 때만 이동·고르기·닫기 키를 처리하고 기본 동작을 막는다. */
	handleKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
	choose: (option: NodeReferenceOption) => void
	close: () => void
}

/**
 * 입력 칸에서 `{{`를 쓰면 출력 참조 후보를 띄우는 자동완성 상태.
 * 포커스는 입력 칸에 둔 채 강조 행을 `aria-activedescendant`로 알리는 방식이며, 후보는 버튼 피커와 같은 그룹을 거른다.
 * Escape로 닫은 `{{`는 커서가 그 질의를 벗어나기 전까지 다시 열지 않는다(벗어났다 돌아오면 다시 연다).
 */
export const useNodeReferenceAutocomplete = ({
	groups,
	onChoose,
}: UseNodeReferenceAutocompleteOptions): UseNodeReferenceAutocompleteResult => {
	const [query, setQuery] = useState<ReferenceQuery | null>(null)
	const [dismissedStart, setDismissedStart] = useState<number | null>(null)
	const [activeIndex, setActiveIndex] = useState(0)

	const isOpen = Boolean(groups && query && query.start !== dismissedStart)
	const filteredGroups = groups && query ? filterNodeReferenceGroups(groups, query.query) : []
	const options = filteredGroups.flatMap(group => group.options)

	const close = () => {
		setQuery(null)
		setActiveIndex(0)
	}

	const handleCaretChange = (text: string, caret: number | null) => {
		const next = caret === null ? null : findReferenceQuery(text, caret)
		// 질의가 바뀌면 첫 후보를 다시 강조한다. 커서만 움직여 같은 질의면 강조를 유지한다.
		if (next?.start !== query?.start || next?.query !== query?.query) setActiveIndex(0)
		if (next?.start !== dismissedStart) setDismissedStart(null)
		setQuery(next)
	}

	const choose = (option: NodeReferenceOption) => {
		if (!query) return
		close()
		onChoose(option.expression, query)
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (!isOpen) return
		// 조합 중이어도 Escape는 목록을 닫아, 설정 패널의 Escape 닫기까지 올라가지 않게 한다.
		if (event.key === 'Escape') {
			event.preventDefault()
			event.stopPropagation()
			setDismissedStart(query?.start ?? null)
			return
		}
		// 한글 조합 중 Enter·방향키는 조합을 끝내는 입력이라 가로채지 않는다.
		if (event.nativeEvent.isComposing) return
		if (options.length === 0) return
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			const step = event.key === 'ArrowDown' ? 1 : -1
			setActiveIndex((activeIndex + step + options.length) % options.length)
			return
		}
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault()
			choose(options[Math.min(activeIndex, options.length - 1)])
		}
	}

	return {
		isOpen,
		groups: filteredGroups,
		// 앞에 연결된 노드가 아예 없으면 목록이 그 사실을 안내하므로 '맞는 후보 없음'으로 보지 않는다.
		hasNoMatch: Boolean(groups?.length && query?.query.trim()) && options.length === 0,
		optionCount: options.length,
		activeIndex,
		setActiveIndex,
		handleCaretChange,
		handleKeyDown,
		choose,
		close,
	}
}
