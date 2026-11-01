import { useId } from 'react'
import { Link } from 'react-router'
import SkeletonPulse from '@/components/common/SkeletonPulse'
import SettingsDropdown, { type SettingsDropdownRow } from '@/components/workflow/settings/SettingsDropdown'
import { useNodeOptionsCombobox } from '@/hooks/workflow/useNodeOptionsCombobox'
import type { NodeOption } from '@/types/nodeOptions'
import { formatFieldDraft, isEmptyFieldValue } from '@/utils/workflow/nodeFieldValue'
import { showsOptionId, type NodeOptionsInputsState } from '@/utils/workflow/nodeOptions'

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

const getBlockedMessage = (inputsState: NodeOptionsInputsState) => {
	if (inputsState.status !== 'blocked') return null
	return inputsState.reason === 'reference'
		? `'${inputsState.parentTitle}' 칸이 참조식이라 목록에서 고를 수 없어요.`
		: `'${inputsState.parentTitle}' 칸을 먼저 채우면 목록에서 고를 수 있어요.`
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
	const blockedMessage = getBlockedMessage(inputsState)
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

	const renderFooter = () => {
		// 막힌 채 열었으면 비우기 행만 보여 준다. 이유는 칸 아래 안내로 이미 알린다.
		if (combobox.isBlocked) return null

		if (combobox.isLoading) {
			return (
				<div role='status' aria-label={`${title} 목록 불러오는 중`} aria-busy='true' className='flex flex-col gap-1 pt-1'>
					{[0, 1, 2].map(index => (
						<SkeletonPulse key={index} className='h-8 rounded-lg bg-neutral-100' />
					))}
				</div>
			)
		}

		const notice = combobox.errorNotice
		if (notice) {
			return (
				<div
					role='alert'
					className='flex flex-col items-start gap-2 px-2.5 pt-2 pb-1 text-xs leading-relaxed text-neutral-600'
				>
					<p className='m-0'>{notice.message}</p>
					{notice.action === 'connect' ? (
						<Link to='/inter-setting' className='font-semibold text-main-deep-blue underline underline-offset-2'>
							통합 설정 열기
						</Link>
					) : (
						<button
							type='button'
							onClick={combobox.retry}
							disabled={combobox.isFetchingNextPage}
							className='rounded-md border border-neutral-200 px-2 py-1 font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
						>
							{combobox.isFetchingNextPage ? '불러오는 중…' : '다시 시도'}
						</button>
					)}
				</div>
			)
		}

		if (combobox.hasNextPage) {
			return (
				<button
					type='button'
					onClick={combobox.fetchNextPage}
					disabled={combobox.isFetchingNextPage}
					className='mt-0.5 w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-main-deep-blue hover:bg-neutral-50 disabled:opacity-60'
				>
					{combobox.isFetchingNextPage ? '불러오는 중…' : '더 불러오기'}
				</button>
			)
		}

		if (combobox.items.length === 0) {
			return <p className='m-0 px-2.5 pt-1.5 pb-1 text-xs text-neutral-500'>고를 수 있는 항목이 없어요.</p>
		}
		return null
	}

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
				footer={renderFooter()}
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
