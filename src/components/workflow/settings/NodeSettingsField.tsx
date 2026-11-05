import { motion } from 'framer-motion'
import { useEffect, useId, useRef, type ChangeEvent, type MouseEvent, type SyntheticEvent } from 'react'
import NodeChoiceSelect, { type NodeChoice } from '@/components/workflow/settings/NodeChoiceSelect'
import NodeDictInput from '@/components/workflow/settings/NodeDictInput'
import NodeOptionsCombobox from '@/components/workflow/settings/NodeOptionsCombobox'
import NodeReferenceList from '@/components/workflow/settings/NodeReferenceList'
import NodeReferencePicker from '@/components/workflow/settings/NodeReferencePicker'
import { DROPDOWN_POPUP_CLASS, INPUT_CLASS, TEXTAREA_CLASS } from '@/components/workflow/settings/settingsFieldClassNames'
import { useNodeReferenceAutocomplete } from '@/hooks/workflow/useNodeReferenceAutocomplete'
import { useNodeSettingsField } from '@/hooks/workflow/useNodeSettingsField'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import type { NodeReferenceSource } from '@/types/nodeReference'
import { cn } from '@/utils/cn'
import {
	formatFieldDraft,
	hasReferenceMode,
	isEmptyFieldValue,
	isFieldEditable,
	isRequiredFieldMissing,
	type NodeFieldMode,
} from '@/utils/workflow/nodeFieldValue'
import type { TextSelection } from '@/utils/workflow/nodeReference'
import { isOptionsComboboxField, type NodeFieldOptions } from '@/utils/workflow/nodeOptions'

const REFERENCE_PLACEHOLDER = '{{nodes.노드ID.output.필드}}'
const DATETIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const MODE_LABELS: Record<NodeFieldMode, string> = { fixed: '값', reference: '참조식' }
const BOOLEAN_CHOICES: NodeChoice[] = [
	{ value: true, label: '예' },
	{ value: false, label: '아니요' },
]

type NodeSettingsFieldProps = {
	field: NodeCatalogInputField
	value: unknown
	/** 선택 목록에서 고른 항목의 표시 이름(`_names`). */
	name?: string
	/** 목록 공급원 칸의 조회 정보. 있으면 드롭다운으로 그린다. */
	options?: NodeFieldOptions
	/** 칸이 비었을 때 칸 아래에 보여 줄 안내(예: AI 도구 칸의 AI 결정). */
	emptyHint?: string
	/** 출력 참조 후보와 참조 검사 문맥. 없으면 참조 피커와 참조 경고를 보여 주지 않는다. */
	references?: NodeReferenceSource
	onChange: (value: unknown, name?: string) => void
}

const getPlaceholder = (field: NodeCatalogInputField) => {
	if (field.default === undefined || field.default === '') return undefined
	return `기본값: ${formatFieldDraft(field.default)}`
}

/** 카탈로그 칸 하나를 type에 맞는 위젯으로 보여 주고 바뀐 값을 저장할 모양으로 넘긴다. */
const NodeSettingsField = ({ field, value, name, options, emptyHint, references, onChange }: NodeSettingsFieldProps) => {
	const inputId = useId()
	const descriptionId = `${inputId}-description`
	const messageId = `${inputId}-message`
	const referenceWarningId = `${inputId}-reference-warning`
	const isOptionsCombobox = Boolean(options && isOptionsComboboxField(field))
	const { mode, changeMode, draft, changeText, changeValue, error, pickerTarget, insertReference, referenceWarning } =
		useNodeSettingsField({ field, value, onChange, isOptionsCombobox, referenceContext: references?.context })
	const isMissing = isRequiredFieldMissing(field, value)
	const describedBy = [
		field.description ? descriptionId : null,
		error || isMissing ? messageId : null,
		referenceWarning ? referenceWarningId : null,
	]
		.filter(Boolean)
		.join(' ')
	const textInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
	// 피커 버튼을 누르면 입력 칸 포커스가 빠지므로 마지막 커서·선택 위치를 기억해 그 자리에 넣는다.
	const selectionRef = useRef<TextSelection | null>(null)
	const pendingCaretRef = useRef<number | null>(null)

	// 넣은 값으로 다시 그린 뒤에 커서를 옮겨야 controlled 입력의 값 갱신이 커서를 끝으로 밀지 않는다.
	// 값 방식 칸은 참조식 입력으로 바뀐 뒤 새 입력 요소에 포커스를 준다.
	useEffect(() => {
		const caret = pendingCaretRef.current
		const element = textInputRef.current
		if (caret === null || !element) return
		pendingCaretRef.current = null
		element.focus()
		element.setSelectionRange(caret, caret)
		selectionRef.current = { start: caret, end: caret }
	})

	const setTextInput = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
		textInputRef.current = element
	}

	const rememberSelection = (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { selectionStart, selectionEnd } = event.currentTarget
		if (selectionStart !== null && selectionEnd !== null) selectionRef.current = { start: selectionStart, end: selectionEnd }
	}

	const insertAt = (expression: string, selection: TextSelection | undefined) => {
		const caret = insertReference(expression, selection)
		if (caret !== undefined) pendingCaretRef.current = caret
	}

	const handleReferenceInsert = (expression: string) => insertAt(expression, selectionRef.current ?? undefined)

	// 커서 위치에 넣는 칸에서만 `{{` 자동완성을 연다. 값 방식 칸은 참조식 방식으로 바꾼 뒤에 쓴다.
	const autocomplete = useNodeReferenceAutocomplete({
		groups: references && pickerTarget === 'caret' ? references.groups : undefined,
		onChoose: insertAt,
	})
	const autocompleteListId = `${inputId}-reference-list`
	const autocompleteOptionId = (index: number) => `${inputId}-reference-option-${index}`
	const autocompletePopupRef = useRef<HTMLDivElement>(null)
	const activeAutocompleteOptionId =
		autocomplete.isOpen && autocomplete.optionCount > 0 ? autocompleteOptionId(autocomplete.activeIndex) : undefined

	// aria-activedescendant 방식이라 브라우저가 강조 행으로 스크롤해 주지 않고, 아래쪽 칸에서 열면 팝업이
	// 패널 스크롤 영역 밖에 생길 수 있다. 열릴 때 팝업을, 강조가 바뀔 때 강조 행을 보이게 한다.
	// jsdom에는 scrollIntoView가 없어 있을 때만 부른다.
	useEffect(() => {
		const popup = autocompletePopupRef.current
		if (!autocomplete.isOpen || !popup) return
		const activeOption = activeAutocompleteOptionId ? popup.querySelector(`#${CSS.escape(activeAutocompleteOptionId)}`) : null
		;(activeOption ?? popup).scrollIntoView?.({ block: 'nearest' })
	}, [autocomplete.isOpen, activeAutocompleteOptionId])

	const handleTextChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		changeText(event.target.value)
		autocomplete.handleCaretChange(event.target.value, event.target.selectionStart)
	}

	const handleSelect = (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		rememberSelection(event)
		autocomplete.handleCaretChange(event.currentTarget.value, event.currentTarget.selectionStart)
	}

	// 목록을 눌러도 입력 칸 포커스를 유지해, blur로 목록이 먼저 닫혀 행 click이 사라지지 않게 한다.
	const keepInputFocus = (event: MouseEvent<HTMLDivElement>) => event.preventDefault()

	const inputProps = {
		id: inputId,
		'aria-describedby': describedBy || undefined,
		'aria-invalid': error ? true : undefined,
	}
	const textInputProps = {
		...inputProps,
		ref: setTextInput,
		onSelect: handleSelect,
		onKeyDown: autocomplete.handleKeyDown,
		onBlur: autocomplete.close,
		'aria-autocomplete': references && pickerTarget === 'caret' ? ('list' as const) : undefined,
		'aria-controls': autocomplete.isOpen ? autocompleteListId : undefined,
		'aria-activedescendant': activeAutocompleteOptionId,
	}

	const renderWidget = () => {
		if (!isFieldEditable(field)) {
			const count = Array.isArray(value) ? value.length : 0
			return (
				<p id={inputId} className='m-0 rounded-lg bg-neutral-50 px-2.5 py-2 text-xs leading-relaxed text-neutral-500'>
					{count > 0 ? `${count}개 설정됨. ` : ''}이 칸은 아직 화면에서 바꿀 수 없어요. 저장하면 지금 값을 그대로
					유지해요.
				</p>
			)
		}

		if (options && isOptionsCombobox) {
			return (
				<NodeOptionsCombobox
					id={inputId}
					title={field.title}
					source={options.source}
					inputsState={options.inputsState}
					value={value}
					name={name}
					placeholder={options.emptyHint}
					clearLabel={options.clearLabel}
					triggerClassName={INPUT_CLASS}
					describedBy={inputProps['aria-describedby']}
					onSelect={option => changeValue(option.id, option.name)}
					onClear={() => changeValue(undefined)}
				/>
			)
		}

		if (mode === 'reference') {
			const referenceProps = {
				...textInputProps,
				value: draft,
				placeholder: REFERENCE_PLACEHOLDER,
			}
			return field.type === 'text' ? (
				<textarea {...referenceProps} onChange={handleTextChange} className={TEXTAREA_CLASS} />
			) : (
				<input {...referenceProps} type='text' onChange={handleTextChange} className={INPUT_CLASS} />
			)
		}

		if ((field.choices || field.type === 'boolean') && !field.list) {
			return (
				<NodeChoiceSelect
					id={inputId}
					title={field.title}
					choices={
						field.choices ? field.choices.map(choice => ({ value: choice.id, label: choice.name })) : BOOLEAN_CHOICES
					}
					value={value}
					triggerClassName={INPUT_CLASS}
					describedBy={inputProps['aria-describedby']}
					onChange={next => changeValue(next)}
				/>
			)
		}

		if (field.type === 'dict') {
			return (
				<NodeDictInput
					id={inputId}
					title={field.title}
					value={value}
					inputClassName={INPUT_CLASS}
					onChange={changeValue}
				/>
			)
		}

		if (field.type === 'text' || field.type === 'json' || field.list) {
			return (
				<textarea
					{...textInputProps}
					value={draft}
					onChange={handleTextChange}
					placeholder={field.list ? '한 줄에 하나씩 입력해 주세요' : getPlaceholder(field)}
					className={cn(TEXTAREA_CLASS, field.type === 'json' && 'font-mono text-xs')}
				/>
			)
		}

		// 오프셋이 붙은 기존 값은 datetime-local로 보여 줄 수 없어 텍스트로 편집한다.
		const isDatetimeInput = field.type === 'datetime' && (draft === '' || DATETIME_INPUT_PATTERN.test(draft))
		return (
			<input
				{...textInputProps}
				type={isDatetimeInput ? 'datetime-local' : 'text'}
				inputMode={field.type === 'integer' || field.type === 'number' ? 'decimal' : undefined}
				value={isDatetimeInput ? draft.slice(0, 16) : draft}
				onChange={handleTextChange}
				placeholder={field.type === 'cron' ? '0 9 * * 1-5' : getPlaceholder(field)}
				className={INPUT_CLASS}
			/>
		)
	}

	return (
		<div className='flex flex-col gap-1.5'>
			{/* 참조 피커 팝업이 이 줄 아래에 칸 너비로 뜬다. */}
			<div className='relative flex min-h-7 items-center gap-1.5'>
				<label htmlFor={inputId} className='min-w-0 flex-1 truncate text-[0.8rem] font-bold text-[#27273b]'>
					{field.title}
					{field.required ? <span className='ml-1 text-[0.7rem] font-semibold text-[#a84c36]'>필수</span> : null}
				</label>
				{hasReferenceMode(field) ? (
					<div
						role='radiogroup'
						aria-label={`${field.title} 입력 방식`}
						className='flex shrink-0 rounded-lg bg-neutral-100 p-0.5'
					>
						{(Object.keys(MODE_LABELS) as NodeFieldMode[]).map(option => (
							<button
								key={option}
								type='button'
								role='radio'
								aria-checked={mode === option}
								onClick={() => changeMode(option)}
								className={cn(
									'rounded-md px-2 py-0.5 text-[0.7rem] font-semibold text-neutral-500',
									mode === option && 'bg-white text-main-deep-blue shadow-sm'
								)}
							>
								{MODE_LABELS[option]}
							</button>
						))}
					</div>
				) : null}
				{references && pickerTarget !== 'none' ? (
					<NodeReferencePicker fieldTitle={field.title} groups={references.groups} onInsert={handleReferenceInsert} />
				) : null}
			</div>
			{field.description ? (
				<p id={descriptionId} className='m-0 text-xs leading-snug text-neutral-500'>
					{field.description}
				</p>
			) : null}
			<div className='relative'>
				{renderWidget()}
				{autocomplete.isOpen && references ? (
					<motion.div
						ref={autocompletePopupRef}
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.15 }}
						onMouseDown={keepInputFocus}
						className={DROPDOWN_POPUP_CLASS}
					>
						<NodeReferenceList
							id={autocompleteListId}
							title={field.title}
							groups={autocomplete.groups}
							activeIndex={autocomplete.activeIndex}
							optionId={autocompleteOptionId}
							emptyMessage={
								autocomplete.hasNoMatch
									? '입력한 내용과 맞는 출력이 없어요. 노드 이름이나 출력 이름으로 찾아보세요.'
									: undefined
							}
							onChoose={autocomplete.choose}
							onActiveChange={autocomplete.setActiveIndex}
						/>
					</motion.div>
				) : null}
				<span aria-live='polite' className='sr-only'>
					{autocomplete.isOpen ? `출력 참조 후보 ${autocomplete.optionCount}개` : ''}
				</span>
			</div>
			{field.optionsSource && !isOptionsCombobox && mode === 'fixed' ? (
				<p className='m-0 text-[0.7rem] leading-snug text-neutral-500'>
					{name ? `선택한 항목: ${name} · ` : ''}이 칸은 목록에서 고를 수 없어요. ID를 직접 입력해 주세요.
				</p>
			) : null}
			{error ? (
				<p id={messageId} role='alert' className='m-0 text-[0.72rem] font-semibold text-[#a84c36]'>
					{error}
				</p>
			) : isMissing ? (
				<p id={messageId} className='m-0 text-[0.72rem] font-semibold text-[#9a6700]'>
					필수 칸이 비어 있어요. 채우지 않으면 실행할 수 없어요.
				</p>
			) : emptyHint && isEmptyFieldValue(value) ? (
				<p className='m-0 text-[0.7rem] leading-snug text-neutral-500'>{emptyHint}</p>
			) : null}
			{referenceWarning ? (
				<p id={referenceWarningId} role='status' className='m-0 typo-caption1_semibold text-warning-700'>
					{referenceWarning}
				</p>
			) : null}
		</div>
	)
}

export default NodeSettingsField
