import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import AiOutputFieldRow from '@/components/workflow/settings/AiOutputFieldRow'
import type { NodeAiOutputFields } from '@/hooks/workflow/useNodeAiOutputFields'
import { cn } from '@/utils/cn'
import { MAX_AI_OUTPUT_FIELDS } from '@/utils/workflow/aiOutputFields'
import WorkflowValidationIssueList from '@/components/workflow/WorkflowValidationIssueList'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'

const ERROR_CLASS = 'm-0 text-[0.72rem] font-semibold text-[#a84c36]'
const BUTTON_CLASS = cn(
	'inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 bg-white px-2.5 py-1.5',
	'text-sm font-semibold text-main-deep-blue hover:bg-neutral-50 focus:border-main-blue focus:outline-none',
	'aria-disabled:cursor-not-allowed aria-disabled:bg-neutral-50 aria-disabled:text-neutral-400'
)

const createRowIds = (start: number, count: number) => Array.from({ length: count }, (_, index) => start + index)

type AiOutputFieldsSectionProps = {
	outputFields: NodeAiOutputFields
	/** 출력 칸(과 각 행)에 붙은 서버 검사 오류. */
	validationErrors?: WorkflowValidationErrorDto[]
}

/**
 * AI 노드 출력 칸 목록 편집기. 칸마다 이름·타입·설명을 편집하고 규칙에 어긋나면 그 칸 아래에 알린다.
 * 저장된 값이 목록이 아니면 행으로 고칠 수 없어 비우기만 제공한다.
 */
const AiOutputFieldsSection = ({ outputFields, validationErrors = [] }: AiOutputFieldsSectionProps) => {
	const { field, labels, value, rows, validation, canAdd, addRow, changeRow, removeRow, clear } = outputFields
	const titleId = useId()
	const limitId = useId()
	const rowCount = rows?.length ?? 0

	// 행 React key. 이 편집기가 바꾼 값이면 미리 정한 id를 쓰고, 밖에서 행 수가 바뀌면 id를 새로 만든다.
	const [rowIds, setRowIds] = useState(() => createRowIds(0, rowCount))
	const [nextId, setNextId] = useState(rowCount)
	const [pendingIds, setPendingIds] = useState<number[] | null>(null)
	const [syncedValue, setSyncedValue] = useState(value)

	if (value !== syncedValue) {
		setSyncedValue(value)
		setPendingIds(null)
		if (pendingIds && pendingIds.length === rowCount) {
			setRowIds(pendingIds)
		} else if (rowIds.length !== rowCount) {
			setRowIds(createRowIds(nextId, rowCount))
			setNextId(nextId + rowCount)
		}
	}

	const handleAdd = () => {
		if (!canAdd) return
		setPendingIds([...rowIds, nextId])
		setNextId(nextId + 1)
		addRow()
	}

	const handleRemove = (index: number) => {
		setPendingIds(rowIds.filter((_, rowIndex) => rowIndex !== index))
		removeRow(index)
	}

	return (
		<section aria-labelledby={titleId} className='flex flex-col gap-2'>
			<h3 id={titleId} className='m-0 text-[0.8rem] font-bold text-[#27273b]'>
				{field.title}
			</h3>
			{field.description ? <p className='m-0 text-xs leading-snug text-neutral-500'>{field.description}</p> : null}
			<WorkflowValidationIssueList errors={validationErrors} />
			{validation.listError ? (
				<p role='alert' className={ERROR_CLASS}>
					{validation.listError}
				</p>
			) : null}
			{rows === undefined ? (
				<button type='button' onClick={clear} className={BUTTON_CLASS}>
					출력 칸 비우기
				</button>
			) : (
				<>
					{rows.length > 0 ? (
						<ul className='m-0 flex list-none flex-col gap-2 p-0'>
							{rows.map((row, index) => (
								<AiOutputFieldRow
									key={rowIds[index] ?? `row-${index}`}
									order={index + 1}
									row={row}
									errors={validation.rowErrors[index] ?? {}}
									labels={labels}
									onChange={patch => changeRow(index, patch)}
									onRemove={() => handleRemove(index)}
								/>
							))}
						</ul>
					) : null}
					{/* disabled로 막으면 20번째 칸을 추가한 순간 포커스가 body로 빠져, 누르기만 막는다. */}
					<button
						type='button'
						onClick={handleAdd}
						aria-disabled={!canAdd || undefined}
						aria-describedby={canAdd ? undefined : limitId}
						className={BUTTON_CLASS}
					>
						<Plus size={14} aria-hidden='true' />
						출력 칸 추가
					</button>
					{canAdd ? null : (
						<p id={limitId} className='m-0 text-xs text-neutral-500'>
							출력 칸은 {MAX_AI_OUTPUT_FIELDS}개까지 만들 수 있어요.
						</p>
					)}
				</>
			)}
		</section>
	)
}

export default AiOutputFieldsSection
