import { useId } from 'react'
import NodeOptionsDropdownFooter from '@/components/workflow/settings/NodeOptionsDropdownFooter'
import SettingsDropdown, { type SettingsDropdownRow } from '@/components/workflow/settings/SettingsDropdown'
import { useNodeOptionsCombobox } from '@/hooks/workflow/useNodeOptionsCombobox'
import type { NodeOption } from '@/types/nodeOptions'
import { formatFieldDraft, isEmptyFieldValue } from '@/utils/workflow/nodeFieldValue'
import { getOptionsBlockedMessage, showsOptionId, type NodeOptionsInputsState } from '@/utils/workflow/nodeOptions'

type NodeOptionsComboboxProps = {
	id: string
	title: string
	source: string
	inputsState: NodeOptionsInputsState
	value: unknown
	name?: string
	/** 값이 없을 때 칸에 보여 줄 안내. */
	placeholder?: string
	/** 목록 맨 위 비우기 행의 이름. */
	clearLabel?: string
	triggerClassName: string
	describedBy?: string
	onSelect: (option: NodeOption) => void
	onClear: () => void
}

/** options API 목록에서만 값을 고르는 드롭다운. 맨 위 비우기 행을 고르면 값을 지운다. */
const NodeOptionsCombobox = ({
	id,
	title,
	source,
	inputsState,
	value,
	name,
	placeholder = '목록에서 골라 주세요',
	clearLabel = '선택 안 함',
	triggerClassName,
	describedBy,
	onSelect,
	onClear,
}: NodeOptionsComboboxProps) => {
	const blockedId = `${useId()}-blocked`
	const combobox = useNodeOptionsCombobox({
		source,
		inputsState,
		hasValue: !isEmptyFieldValue(value),
		onSelect,
		onClear,
	})
	const blockedMessage = getOptionsBlockedMessage(inputsState)
	// 빈 이름은 이름이 없는 것으로 보고 ID를 보여 준다. 목록에 없는 값·참조식도 그대로 보여 준다.
	const displayText = name || formatFieldDraft(value)
	const showsId = showsOptionId(source)

	const rows: SettingsDropdownRow[] = [
		{ key: 'clear', label: clearLabel, isCurrent: isEmptyFieldValue(value), isMuted: true },
		...combobox.items.map(option => ({
			key: `option-${option.id}`,
			label: option.name || option.id,
			detail: showsId && option.name && option.name !== option.id ? option.id : undefined,
			isCurrent: option.id === value,
		})),
	]

	return (
		<div>
			<SettingsDropdown
				id={id}
				title={title}
				state={combobox.dropdown}
				rows={rows}
				onChoose={combobox.choose}
				triggerText={displayText || placeholder}
				isPlaceholder={!displayText}
				triggerClassName={triggerClassName}
				describedBy={[describedBy, blockedMessage ? blockedId : null].filter(Boolean).join(' ') || undefined}
				footer={<NodeOptionsDropdownFooter title={title} combobox={combobox} />}
			/>
			{name && showsId ? <p className='m-0 mt-1 truncate text-[0.7rem] text-neutral-500'>ID: {String(value)}</p> : null}
			{blockedMessage ? (
				<p id={blockedId} className='m-0 mt-1 text-[0.7rem] leading-snug text-neutral-500'>
					{blockedMessage}
				</p>
			) : null}
		</div>
	)
}

export default NodeOptionsCombobox
