import SettingsDropdown, { type SettingsDropdownRow } from '@/components/workflow/settings/SettingsDropdown'
import { useSettingsDropdown } from '@/hooks/workflow/useSettingsDropdown'
import { formatFieldDraft, isEmptyFieldValue } from '@/utils/workflow/nodeFieldValue'

export type NodeChoice = { value: string | boolean; label: string }

type NodeChoiceSelectProps = {
	id: string
	title: string
	choices: NodeChoice[]
	value: unknown
	triggerClassName: string
	describedBy?: string
	/** 고른 값을 넘긴다. 맨 위 '선택 안 함'은 `undefined`(비움)다. */
	onChange: (value: string | boolean | undefined) => void
}

const CLEAR_LABEL = '선택 안 함'

/** 고정 선택지(choices·예/아니요) 칸의 드롭다운. 선택지에 없는 저장값은 지우지 않고 따로 보여 준다. */
const NodeChoiceSelect = ({ id, title, choices, value, triggerClassName, describedBy, onChange }: NodeChoiceSelectProps) => {
	const dropdown = useSettingsDropdown()
	const isEmpty = isEmptyFieldValue(value)
	const current = choices.find(choice => choice.value === value)
	const unknownLabel = !isEmpty && !current ? `목록에 없는 값 (${formatFieldDraft(value)})` : null

	const rows: SettingsDropdownRow[] = [
		{ key: 'clear', label: CLEAR_LABEL, isCurrent: isEmpty, isMuted: true },
		...(unknownLabel ? [{ key: 'unknown', label: unknownLabel, isCurrent: true }] : []),
		...choices.map(choice => ({ key: `choice-${String(choice.value)}`, label: choice.label, isCurrent: choice === current })),
	]
	const choiceOffset = unknownLabel ? 2 : 1

	// 목록에 없는 값 행은 지금 값을 그대로 두는 행이라 고를 때 아무것도 바꾸지 않는다.
	const choose = (rowIndex: number) => {
		if (rowIndex === 0) onChange(undefined)
		else if (rowIndex >= choiceOffset) onChange(choices[rowIndex - choiceOffset].value)
	}

	return (
		<SettingsDropdown
			id={id}
			title={title}
			state={dropdown}
			rows={rows}
			onChoose={choose}
			triggerText={current?.label ?? unknownLabel ?? CLEAR_LABEL}
			isPlaceholder={isEmpty}
			triggerClassName={triggerClassName}
			describedBy={describedBy}
		/>
	)
}

export default NodeChoiceSelect
