import { useId } from 'react'
import NodeDictInput from '@/components/workflow/settings/NodeDictInput'
import { useNodeSettingsField } from '@/hooks/workflow/useNodeSettingsField'
import type { NodeCatalogInputField } from '@/types/nodeCatalog'
import { cn } from '@/utils/cn'
import {
	formatFieldDraft,
	hasReferenceMode,
	isFieldEditable,
	isRequiredFieldMissing,
	type NodeFieldMode,
} from '@/utils/workflow/nodeFieldValue'

const INPUT_CLASS = cn(
	'w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-[#27273b]',
	'placeholder:text-neutral-400 focus:border-main-blue focus:outline-none',
	'aria-invalid:border-[#d4664a]'
)
const TEXTAREA_CLASS = cn(INPUT_CLASS, 'min-h-20 resize-y leading-relaxed')
const REFERENCE_PLACEHOLDER = '{{nodes.노드ID.output.필드}}'
const DATETIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const MODE_LABELS: Record<NodeFieldMode, string> = { fixed: '값', reference: '참조식' }

type NodeSettingsFieldProps = {
	field: NodeCatalogInputField
	value: unknown
	/** 선택 목록에서 고른 항목의 표시 이름(`_names`). */
	name?: string
	onChange: (value: unknown) => void
}

const getPlaceholder = (field: NodeCatalogInputField) => {
	if (field.default === undefined || field.default === '') return undefined
	return `기본값: ${formatFieldDraft(field.default)}`
}

/** 카탈로그 칸 하나를 type에 맞는 위젯으로 보여 주고 바뀐 값을 저장할 모양으로 넘긴다. */
const NodeSettingsField = ({ field, value, name, onChange }: NodeSettingsFieldProps) => {
	const inputId = useId()
	const descriptionId = `${inputId}-description`
	const messageId = `${inputId}-message`
	const { mode, changeMode, draft, changeText, changeValue, error } = useNodeSettingsField({ field, value, onChange })
	const isMissing = isRequiredFieldMissing(field, value)
	const describedBy = [field.description ? descriptionId : null, error || isMissing ? messageId : null]
		.filter(Boolean)
		.join(' ')
	const inputProps = {
		id: inputId,
		'aria-describedby': describedBy || undefined,
		'aria-invalid': error ? true : undefined,
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

		if (mode === 'reference') {
			const referenceProps = {
				...inputProps,
				value: draft,
				placeholder: REFERENCE_PLACEHOLDER,
			}
			return field.type === 'text' ? (
				<textarea {...referenceProps} onChange={event => changeText(event.target.value)} className={TEXTAREA_CLASS} />
			) : (
				<input
					{...referenceProps}
					type='text'
					onChange={event => changeText(event.target.value)}
					className={INPUT_CLASS}
				/>
			)
		}

		if (field.choices && !field.list) {
			const selected = typeof value === 'string' ? value : ''
			const isUnknown = selected !== '' && !field.choices.some(choice => choice.id === selected)
			return (
				<select
					{...inputProps}
					value={selected}
					onChange={event => changeValue(event.target.value || undefined)}
					className={INPUT_CLASS}
				>
					<option value=''>선택 안 함</option>
					{isUnknown ? <option value={selected}>{`목록에 없는 값 (${selected})`}</option> : null}
					{field.choices.map(choice => (
						<option key={choice.id} value={choice.id}>
							{choice.name}
						</option>
					))}
				</select>
			)
		}

		if (field.type === 'boolean' && !field.list) {
			return (
				<select
					{...inputProps}
					value={typeof value === 'boolean' ? String(value) : ''}
					onChange={event => changeValue(event.target.value === '' ? undefined : event.target.value === 'true')}
					className={INPUT_CLASS}
				>
					<option value=''>선택 안 함</option>
					<option value='true'>예</option>
					<option value='false'>아니요</option>
				</select>
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
					{...inputProps}
					value={draft}
					onChange={event => changeText(event.target.value)}
					placeholder={field.list ? '한 줄에 하나씩 입력해 주세요' : getPlaceholder(field)}
					className={cn(TEXTAREA_CLASS, field.type === 'json' && 'font-mono text-xs')}
				/>
			)
		}

		// 오프셋이 붙은 기존 값은 datetime-local로 보여 줄 수 없어 텍스트로 편집한다.
		const isDatetimeInput = field.type === 'datetime' && (draft === '' || DATETIME_INPUT_PATTERN.test(draft))
		return (
			<input
				{...inputProps}
				type={isDatetimeInput ? 'datetime-local' : 'text'}
				inputMode={field.type === 'integer' || field.type === 'number' ? 'decimal' : undefined}
				value={isDatetimeInput ? draft.slice(0, 16) : draft}
				onChange={event => changeText(event.target.value)}
				placeholder={field.type === 'cron' ? '0 9 * * 1-5' : getPlaceholder(field)}
				className={INPUT_CLASS}
			/>
		)
	}

	return (
		<div className='flex flex-col gap-1.5'>
			<div className='flex min-h-7 items-center gap-1.5'>
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
			</div>
			{field.description ? (
				<p id={descriptionId} className='m-0 text-xs leading-snug text-neutral-500'>
					{field.description}
				</p>
			) : null}
			{renderWidget()}
			{field.optionsSource && mode === 'fixed' ? (
				<p className='m-0 text-[0.7rem] leading-snug text-neutral-500'>
					{name ? `선택한 항목: ${name} · ` : ''}목록에서 고르기는 준비 중이에요. ID를 직접 입력해 주세요.
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
			) : null}
		</div>
	)
}

export default NodeSettingsField
