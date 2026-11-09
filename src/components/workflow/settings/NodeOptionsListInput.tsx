import { useId, useRef } from 'react'
import { X } from 'lucide-react'
import NodeOptionsDropdownFooter from '@/components/workflow/settings/NodeOptionsDropdownFooter'
import SettingsDropdown, { type SettingsDropdownRow } from '@/components/workflow/settings/SettingsDropdown'
import { useNodeOptionsCombobox } from '@/hooks/workflow/useNodeOptionsCombobox'
import type { NodeOption, NodeOptionNames } from '@/types/nodeOptions'
import { addOptionListItem, readOptionListIds, removeOptionListItem } from '@/utils/workflow/nodeOptionList'
import { getOptionsBlockedMessage, showsOptionId, type NodeOptionsInputsState } from '@/utils/workflow/nodeOptions'

type NodeOptionsListInputProps = {
	/** 추가 드롭다운 트리거 id. 칸 label이 가리킨다. */
	id: string
	title: string
	source: string
	inputsState: NodeOptionsInputsState
	value: unknown
	/** 고른 항목의 id별 표시 이름(`_names`). */
	names?: NodeOptionNames
	triggerClassName: string
	describedBy?: string
	/** 바뀐 id 목록과 남은 표시 이름을 넘긴다. 값이 `undefined`면 칸을 비운다. */
	onChange: (value: string[] | undefined, names: NodeOptionNames | undefined) => void
}

/**
 * options API 목록에서 여러 항목을 고르는 목록 칸. 고른 항목은 칩으로 보여 주고 '추가' 드롭다운에서 하나씩 더한다.
 * 이미 고른 항목은 드롭다운에 체크로 보이며 다시 고르면 뺀다. 칩의 빼기 버튼으로도 뺄 수 있다.
 */
const NodeOptionsListInput = ({
	id,
	title,
	source,
	inputsState,
	value,
	names,
	triggerClassName,
	describedBy,
	onChange,
}: NodeOptionsListInputProps) => {
	const blockedId = `${useId()}-blocked`
	const rootRef = useRef<HTMLDivElement>(null)
	const ids = readOptionListIds(value)
	const showsId = showsOptionId(source)

	const handleSelect = (option: NodeOption) => {
		const next = ids.includes(option.id) ? removeOptionListItem(ids, names, option.id) : addOptionListItem(ids, names, option)
		onChange(next.value, next.names)
	}

	// 칩 목록 밖의 값을 지울 비우기 행이 필요 없어, 비우기 행 없이 항목만 보여 준다.
	// 부모 칸이 막혀 있으면 열지 않고 칩의 빼기 버튼으로만 지운다.
	const combobox = useNodeOptionsCombobox({ source, inputsState, hasValue: false, onSelect: handleSelect })
	const blockedMessage = getOptionsBlockedMessage(inputsState)

	const handleRemove = (itemId: string) => {
		const next = removeOptionListItem(ids, names, itemId)
		onChange(next.value, next.names)
		// 누른 빼기 버튼이 칩과 함께 사라져 포커스가 body로 빠지지 않게 추가 드롭다운으로 옮긴다.
		rootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.focus()
	}

	const rows: SettingsDropdownRow[] = combobox.items.map(option => {
		const label = option.name || option.id
		const detail = showsId && option.name && option.name !== option.id ? option.id : undefined
		const isSelected = ids.includes(option.id)
		return {
			key: `option-${option.id}`,
			label,
			detail,
			isCurrent: isSelected,
			// 이미 고른 행은 고르면 빠지는데 체크 아이콘은 보조기술에 전해지지 않아, 이름에 상태와 동작을 함께 알린다.
			ariaLabel: isSelected ? `${[label, detail].filter(Boolean).join(' ')}, 선택됨, 고르면 빼요` : undefined,
		}
	})

	return (
		<div ref={rootRef} className='flex flex-col gap-1.5'>
			{ids.length > 0 ? (
				<ul aria-label={`고른 ${title}`} className='m-0 flex list-none flex-wrap gap-1.5 p-0'>
					{ids.map(itemId => {
						// 이름이 없는 값(목록에 없는 항목 등)은 ID를 그대로 보여 준다.
						const label = names?.[itemId] || itemId
						return (
							<li
								key={itemId}
								className='flex max-w-full items-center gap-1 rounded-full bg-main-light-blue py-0.5 pr-1 pl-2.5 text-main-deep-blue'
							>
								<span className='min-w-0 truncate typo-caption1_semibold'>{label}</span>
								{showsId && label !== itemId ? (
									<span className='shrink-0 typo-caption2_regular text-neutral-500'>{itemId}</span>
								) : null}
								<button
									type='button'
									aria-label={`${label} 빼기`}
									onClick={() => handleRemove(itemId)}
									className='flex size-5 shrink-0 items-center justify-center rounded-full text-main-deep-blue hover:bg-neutral-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'
								>
									<X size={12} aria-hidden='true' />
								</button>
							</li>
						)
					})}
				</ul>
			) : null}
			<SettingsDropdown
				id={id}
				title={title}
				state={combobox.dropdown}
				rows={rows}
				onChoose={combobox.choose}
				triggerText='목록에서 골라 추가'
				isPlaceholder
				triggerClassName={triggerClassName}
				describedBy={[describedBy, blockedMessage ? blockedId : null].filter(Boolean).join(' ') || undefined}
				footer={<NodeOptionsDropdownFooter title={title} combobox={combobox} />}
			/>
			{blockedMessage ? (
				<p id={blockedId} className='m-0 typo-caption2_regular text-neutral-500'>
					{blockedMessage}
				</p>
			) : null}
		</div>
	)
}

export default NodeOptionsListInput
