import { X } from 'lucide-react'
import { useId } from 'react'
import NodeChoiceSelect from '@/components/workflow/settings/NodeChoiceSelect'
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/workflow/settings/settingsFieldClassNames'
import type { NodeAiOutputFields } from '@/hooks/workflow/useNodeAiOutputFields'
import { cn } from '@/utils/cn'
import {
	countDescriptionLength,
	MAX_AI_OUTPUT_FIELD_DESCRIPTION,
	type AiOutputFieldErrors,
	type AiOutputFieldRow as AiOutputFieldRowValue,
} from '@/utils/workflow/aiOutputFields'

const ERROR_CLASS = 'm-0 text-[0.72rem] font-semibold text-[#a84c36]'

type AiOutputFieldRowProps = {
	/** 화면에 보이는 순번(1부터). 접근성 이름에 쓴다. */
	order: number
	row: AiOutputFieldRowValue
	errors: AiOutputFieldErrors
	labels: NodeAiOutputFields['labels']
	onChange: (patch: Partial<AiOutputFieldRowValue>) => void
	onRemove: () => void
}

/** 출력 칸 한 행. 이름·타입을 한 줄에, 설명을 그 아래에 두고 속성별 오류를 칸 바로 아래에 보여 준다. */
const AiOutputFieldRow = ({ order, row, errors, labels, onChange, onRemove }: AiOutputFieldRowProps) => {
	const id = useId()
	const keyErrorId = `${id}-key-error`
	const typeErrorId = `${id}-type-error`
	const descriptionErrorId = `${id}-description-error`
	const descriptionLength = countDescriptionLength(row.description)

	return (
		<li className='flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-2.5'>
			<div className='grid grid-cols-[minmax(0,1fr)_6.5rem_2rem] gap-1.5'>
				<input
					type='text'
					value={row.key}
					onChange={event => onChange({ key: event.target.value })}
					aria-label={`${order}번째 출력 칸 ${labels.key}`}
					aria-invalid={errors.key ? true : undefined}
					aria-describedby={errors.key ? keyErrorId : undefined}
					placeholder='예: summary'
					autoComplete='off'
					spellCheck={false}
					className={cn(INPUT_CLASS, 'font-mono text-xs')}
				/>
				<div className='min-w-0'>
					<label htmlFor={`${id}-type`} className='sr-only'>
						{`${order}번째 출력 칸 ${labels.type}`}
					</label>
					<NodeChoiceSelect
						id={`${id}-type`}
						title={`${order}번째 출력 칸 ${labels.type}`}
						choices={labels.typeChoices.map(choice => ({ value: choice.id, label: choice.name }))}
						value={row.type}
						triggerClassName={INPUT_CLASS}
						describedBy={errors.type ? typeErrorId : undefined}
						invalid={Boolean(errors.type)}
						onChange={value => onChange({ type: typeof value === 'string' ? value : '' })}
					/>
				</div>
				<button
					type='button'
					onClick={onRemove}
					aria-label={`${order}번째 출력 칸 삭제`}
					className='grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100'
				>
					<X size={14} aria-hidden='true' />
				</button>
			</div>
			{errors.key ? (
				<p id={keyErrorId} role='alert' className={ERROR_CLASS}>
					{errors.key}
				</p>
			) : null}
			{errors.type ? (
				<p id={typeErrorId} role='alert' className={ERROR_CLASS}>
					{errors.type}
				</p>
			) : null}
			<textarea
				value={row.description}
				onChange={event => onChange({ description: event.target.value })}
				aria-label={`${order}번째 출력 칸 ${labels.description}`}
				aria-invalid={errors.description ? true : undefined}
				aria-describedby={errors.description ? descriptionErrorId : undefined}
				placeholder='이 칸에 무엇을 담을지 AI에게 알려 주세요(선택)'
				rows={2}
				className={cn(TEXTAREA_CLASS, 'min-h-14 text-xs')}
			/>
			<div className='flex items-start justify-between gap-2'>
				{errors.description ? (
					<p id={descriptionErrorId} role='alert' className={ERROR_CLASS}>
						{errors.description}
					</p>
				) : (
					<span />
				)}
				<span
					aria-hidden='true'
					className={cn(
						'shrink-0 text-[0.7rem] text-neutral-400',
						descriptionLength > MAX_AI_OUTPUT_FIELD_DESCRIPTION && 'font-semibold text-[#a84c36]'
					)}
				>
					{descriptionLength}/{MAX_AI_OUTPUT_FIELD_DESCRIPTION}
				</span>
			</div>
			{errors.item ? (
				<p role='alert' className={ERROR_CLASS}>
					{errors.item}
				</p>
			) : null}
		</li>
	)
}

export default AiOutputFieldRow
